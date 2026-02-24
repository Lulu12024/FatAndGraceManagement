import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    Connects users to personal groups and role-based groups.
    
    ws://server/ws/notifications/
    
    Message types:
    - new_order: nouvelle commande (pour cuisiniers)
    - order_accepted: commande acceptée (pour serveurs)
    - order_rejected: commande refusée (pour serveurs)
    - order_ready: commande prête (pour serveurs)
    - order_cancelled: commande annulée
    - order_delivered: commande livrée
    - stock_alert: alerte stock bas
    - peremption_alert: alerte péremption
    - mvt_validated: mouvement validé
    - mvt_rejected: mouvement rejeté
    """

    async def connect(self):
        self.user = self.scope.get('user')

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        # Personal notification group
        self.user_group = f'user_{self.user.id}'
        await self.channel_layer.group_add(
            self.user_group,
            self.channel_name
        )

        # Role-based group
        role_name = await self.get_user_role()
        if role_name:
            self.role_group = f'role_{role_name.lower().replace(" ", "_")}'
            await self.channel_layer.group_add(
                self.role_group,
                self.channel_name
            )

        # Global group for broadcast messages
        self.global_group = 'global_notifications'
        await self.channel_layer.group_add(
            self.global_group,
            self.channel_name
        )

        await self.accept()

        # Send unread notification count on connect
        count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'connected',
            'unread_count': count,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(
                self.user_group,
                self.channel_name
            )
        if hasattr(self, 'role_group'):
            await self.channel_layer.group_discard(
                self.role_group,
                self.channel_name
            )
        if hasattr(self, 'global_group'):
            await self.channel_layer.group_discard(
                self.global_group,
                self.channel_name
            )

    async def receive(self, text_data):
        """Handle incoming messages (e.g., mark notification as read)"""
        try:
            data = json.loads(text_data)
            msg_type = data.get('type')

            if msg_type == 'mark_read':
                notification_id = data.get('notification_id')
                if notification_id:
                    await self.mark_notification_read(notification_id)
                    await self.send(text_data=json.dumps({
                        'type': 'notification_read',
                        'notification_id': notification_id,
                    }))
        except json.JSONDecodeError:
            pass

    async def notification_message(self, event):
        """Handle notification messages sent to groups"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification_type': event.get('notification_type', ''),
            'message': event.get('message', ''),
            'data': event.get('data', {}),
            'created_at': event.get('created_at', ''),
        }))

    @database_sync_to_async
    def get_user_role(self):
        try:
            return self.user.role.nom
        except Exception:
            return None

    @database_sync_to_async
    def get_unread_count(self):
        from commandes.models import Notification
        return Notification.objects.filter(user=self.user, is_read=False).count()

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        from commandes.models import Notification
        Notification.objects.filter(
            id=notification_id, user=self.user
        ).update(is_read=True)
