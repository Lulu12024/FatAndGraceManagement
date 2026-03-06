/**
 * FATE & GRÂCE — Application Principale
 * Entry point léger : routing + état global uniquement.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { injectGlobalCSS, C, TABLE_STATUS } from "./styles/tokens";
import { useToast, useOfflineDetect, handleApiError } from "./hooks";
import { authService } from "./api/auth";
import { tablesService } from "./api/tables";
import { ordersService } from "./api/orders";
import { productsService, movementsService } from "./api/stock";
import { invoicesService, usersService, auditService, reportsService, notificationsService } from "./api/services";
import { MOCK_TABLES, MOCK_ORDERS, MOCK_PRODUCTS, MOCK_MOVEMENTS, MOCK_INVOICES, MOCK_AUDIT, MOCK_USERS, MOCK_PLATS, ROLES } from "./mock";
import { unwrap } from "./api/client";
import { platsService } from "./api/plats"; 

// Layout
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { ToastContainer, OfflineBanner } from "./components/ui";

// Screens
import LoginScreen from "./screens/LoginScreen";
import DashboardScreen from "./screens/DashboardScreen";
import TablesScreen from "./screens/TablesScreen";
import TableDetailScreen from "./screens/TableDetailScreen";
import KitchenScreen from "./screens/KitchenScreen";
import OrdersListScreen from "./screens/OrdersListScreen";
import StockScreen from "./screens/StockScreen";
import StockEntriesScreen from "./screens/StockEntriesScreen";
import MovementsScreen from "./screens/MovementsScreen";
import StockRequestScreen from "./screens/StockRequestScreen";
import InvoicesScreen from "./screens/InvoicesScreen";
import ReportsScreen from "./screens/ReportsScreen";
import TeamScreen from "./screens/TeamScreen";
import AuditScreen from "./screens/AuditScreen";
import StatsScreen from "./screens/StatsScreen";
import PlatsScreen from "./screens/PlatsScreen";

export default function App() {
  useEffect(() => { injectGlobalCSS(); }, []);

  // Auth state
  const [user, setUser]       = useState(null);

  // Navigation
  const [screen, setScreen]   = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [selTable, setSelTable]   = useState(null);

  // Toast
  const { toasts, toast, removeToast } = useToast();

  // Offline detection
  const isOnline = useOfflineDetect(toast);

  // Core data state (loaded from API, fallback to mock)
  const [tables,    setTables]    = useState(MOCK_TABLES);
  const [orders,    setOrders]    = useState(MOCK_ORDERS);
  const [products,  setProducts]  = useState(MOCK_PRODUCTS);
  const [movements, setMovements] = useState(MOCK_MOVEMENTS);
  const [plats, setPlats] = useState(MOCK_PLATS);

  // const invoices = MOCK_INVOICES;
  const [invoices, setInvoices] = useState(MOCK_INVOICES);
  // const plats    = MOCK_PLATS;

  // Initial data load from API
  useEffect(() => {
    if (!user) return;
    Promise.all([
      tablesService.list().then(d => { if(d) setTables(unwrap(d)); }),
      ordersService.list().then(d  => { if(d) setOrders(unwrap(d)); }),
      productsService.list().then(d => { if(d) setProducts(unwrap(d)); }),
      movementsService.list().then(d => { if(d) setMovements(unwrap(d)); }),
      platsService.list().then(d    => {  if (d) setPlats(Array.isArray(d) ? d : (d.results ?? [])); }),
      invoicesService.list().then(d => { if(d) setInvoices(Array.isArray(d) ? d : (d.results ?? [])); }),
    ]).catch(() => {
      // Mock data already set — graceful degradation
    });
  }, [user]);

  // WebSocket for real-time notifications
  useEffect(() => {
    if (!user) return;
    const cleanup = notificationsService.connectWebSocket((msg) => {
      if (msg.type === "new_order")     toast.gold("Nouvelle commande",  `Table ${msg.data?.table_num}`);
      if (msg.type === "order_ready")   toast.info("Commande prête",     `${msg.data?.order_id} — serveur notifié`);
      if (msg.type === "stock_alert")   toast.warning("Alerte stock",   msg.data?.message);
      if (msg.type === "mvt_validated") toast.success("Stock validé",   "Mouvement approuvé");
      // Refresh relevant data on WS event
      if (msg.type === "new_order") ordersService.list().then(d=>{ if(d) setOrders(unwrap(d)); }).catch(()=>{});
    });
    return cleanup;
  }, [user]); // eslint-disable-line

  // Unauthorized handler
  useEffect(() => {
    const handler = () => { setUser(null); toast.error("Session expirée","Veuillez vous reconnecter."); };
    window.addEventListener("fg:unauthorized", handler);
    return () => window.removeEventListener("fg:unauthorized", handler);
  }, []); // eslint-disable-line

  const notifCount = useMemo(() =>
    orders.filter(o=>o.status==="EN_ATTENTE_ACCEPTATION").length +
    products.filter(p=>p.qte<p.seuil).length +
    movements.filter(m=>m.statut==="EN_ATTENTE").length
  , [orders, products, movements]);

  const handleLogin  = (u)  => { setUser(u); setScreen("dashboard"); };
  const handleLogout = ()   => { authService.logout(); setUser(null); setScreen("dashboard"); };
  const handleNav    = (s)  => { setScreen(s); setSelTable(null); };

  const handleSelTable = (t) => {
    setSelTable(t);
    setScreen("table-detail");
    // Recharger les commandes de cette table depuis l'API
    ordersService.list({ table_id: t.id })
      .then(d => {
        if (d) {
          const fresh = Array.isArray(d) ? d : (d.results ?? []);
          // Fusionner — remplacer les commandes de cette table
          setOrders(prev => [
            ...prev.filter(o => (o.tableId ?? o.table_id) !== t.id),
            ...fresh,
          ]);
        }
      })
      .catch(() => {});
  };

  if (!user) return (
    <>
      <LoginScreen onLogin={handleLogin} toast={toast}/>
      <ToastContainer toasts={toasts} removeToast={removeToast}/>
    </>
  );

  const SCREEN_TITLES = {
    dashboard:"Tableau de bord", tables:"Gestion des tables", kitchen:"Cuisine",
    orders:"Commandes", stock:"Stock", "stock-entries":"Entrées de stock",
    "stock-exits":"Sorties de stock", "stock-history":"Historique des mouvements",
    "stock-validate":"Validation stock", "stock-request":"Demande de stock",
    invoices:"Factures", reports:"Rapports & KPI", team:"Équipe & Utilisateurs",menu: "Gestion du menu",
    audit:"Journal d'audit", stats:"Mes statistiques", "table-detail":`Table ${selTable?.numero ||""}`,
  };

  const renderScreen = () => {
    const normalizedRole = (user?.role || "")
      .toLowerCase()
      .replace("gestionnaire de stock", "gestionnaire")
      .replace("administrateur", "admin")
      .replace("gérant", "gerant");
      
    const role = normalizedRole;
    const sharedProps = { role, toast };
    if (screen==="table-detail" && selTable) {
      return <TableDetailScreen {...sharedProps} table={selTable} orders={orders} setOrders={setOrders} setTables={setTables} plats={plats}/>;
    }
    switch(screen) {
      case "dashboard":     return <DashboardScreen {...sharedProps} tables={tables} orders={orders} products={products} movements={movements}/>;
      case "tables":        return <TablesScreen {...sharedProps} tables={tables} setTables={setTables} orders={orders} onSelectTable={handleSelTable}/>;
      case "kitchen":       return <KitchenScreen {...sharedProps} orders={orders} setOrders={setOrders} products={products} movements={movements} setMovements={setMovements}/>;
      case "orders":        return <OrdersListScreen {...sharedProps} orders={orders} setOrders={setOrders} tables={tables}/>;
      case "stock":         return <StockScreen {...sharedProps} products={products} setProducts={setProducts} movements={movements} setMovements={setMovements}/>;
      case "stock-entries": return <StockEntriesScreen {...sharedProps} products={products} movements={movements} setMovements={setMovements}/>;
      case "stock-exits":   return <MovementsScreen {...sharedProps} movements={movements} setMovements={setMovements} products={products} typeFilter="SUPPRESSION"/>;
      case "stock-history": return <MovementsScreen {...sharedProps} movements={movements} setMovements={setMovements} products={products} typeFilter="ALL"/>;
      case "stock-validate":return <MovementsScreen {...sharedProps} movements={movements} setMovements={setMovements} products={products} typeFilter="ALL"/>;
      case "stock-request": return <StockRequestScreen {...sharedProps} products={products} movements={movements} setMovements={setMovements}/>;
      case "invoices":      return <InvoicesScreen {...sharedProps}/>;
      case "reports":       return <ReportsScreen {...sharedProps} orders={orders} products={products} movements={movements} invoices={invoices}/>;
      case "team":          return <TeamScreen {...sharedProps}/>;
      case "audit":         return <AuditScreen {...sharedProps}/>;
      case "stats":         return <StatsScreen {...sharedProps} orders={orders}/>;
      case "menu":          return <PlatsScreen role={role} toast={toast} plats={plats} setPlats={setPlats}/>;
      default:              return <DashboardScreen {...sharedProps} tables={tables} orders={orders} products={products} movements={movements}/>;
    }
  };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar
        role={user.role} screen={screen} onNav={handleNav}
        user={user} onLogout={handleLogout}
        collapsed={collapsed} setCollapsed={setCollapsed}
        notifCount={notifCount}
      />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <OfflineBanner isOnline={isOnline}/>
        <Header
          title={SCREEN_TITLES[screen]||""}
          subtitle={screen==="table-detail"&&selTable
            ? `${TABLE_STATUS[selTable.status]?.label||""} · ${selTable.capacite} couverts`
            : new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          actions={
            screen==="table-detail" &&
            <button onClick={()=>{setScreen("tables");setSelTable(null);}}
              style={{ background:C.bg3, border:`1px solid rgba(255,255,255,0.08)`, color:C.mutedL,
                borderRadius:8, padding:"7px 14px", fontSize:12, fontFamily:"'Raleway',sans-serif", cursor:"pointer" }}>
              ← Retour aux tables
            </button>
          }
          notifCount={notifCount}
        />
        <div style={{ flex:1, overflowY:"auto", background:C.bg0 }}>
          {renderScreen()}
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast}/>
    </div>
  );
}
