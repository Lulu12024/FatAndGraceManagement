from rest_framework import serializers
from .models import User, Role, Permission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'nom', 'description']


class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Role
        fields = ['id', 'nom', 'description', 'permissions']


class UserSerializer(serializers.ModelSerializer):
    """Serializer complet pour un utilisateur (lecture)"""
    role = serializers.CharField(source='role.nom', read_only=True)
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'login', 'first_name', 'last_name', 'nom_complet',
            'email', 'telephone', 'date_de_naissance', 'sexe',
            'role', 'is_activite', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']

    def get_nom_complet(self, obj):
        return obj.get_full_name()


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un utilisateur"""
    role_id = serializers.IntegerField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = [
            'login', 'password', 'first_name', 'last_name',
            'email', 'telephone', 'date_de_naissance', 'sexe', 'role_id'
        ]

    def validate_role_id(self, value):
        try:
            Role.objects.get(id=value)
        except Role.DoesNotExist:
            raise serializers.ValidationError("Rôle introuvable")
        return value

    def create(self, validated_data):
        role_id = validated_data.pop('role_id')
        password = validated_data.pop('password')
        role = Role.objects.get(id=role_id)
        user = User.objects.create_user(
            password=password,
            role=role,
            **validated_data
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour modifier un utilisateur"""
    role_id = serializers.IntegerField(required=False)

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'telephone',
            'date_de_naissance', 'sexe', 'role_id'
        ]

    def update(self, instance, validated_data):
        role_id = validated_data.pop('role_id', None)
        if role_id:
            try:
                instance.role = Role.objects.get(id=role_id)
            except Role.DoesNotExist:
                raise serializers.ValidationError({"role_id": "Rôle introuvable"})

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)

    def validate_new_password(self, value):
        if len(value) < 6:
            raise serializers.ValidationError(
                "Le mot de passe doit contenir au moins 6 caractères"
            )
        return value


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField()


class MeSerializer(serializers.ModelSerializer):
    """Serializer pour le profil utilisateur connecté"""
    role = serializers.CharField(source='role.nom', read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'login', 'first_name', 'last_name',
            'email', 'telephone', 'role', 'permissions'
        ]

    def get_permissions(self, obj):
        perms = obj.permissions.all()
        return [p.nom for p in perms]
