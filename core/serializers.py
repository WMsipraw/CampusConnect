# core/serializers.py
from rest_framework import serializers
from .models import User, Request, Booking, Provider

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'fullname', 'email', 'university_id', 'password']
        extra_kwargs = {'password': {'write_only': True}} # Protects passwords from being sent in API responses

    def create(self, validated_data):
        # Securely hash the password instead of storing it in plain text
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['email'], # Use email as username
            fullname=validated_data['fullname'],
            university_id=validated_data['university_id'],
            password=validated_data['password']
        )
        return user

class RequestSerializer(serializers.ModelSerializer):
    userName = serializers.ReadOnlyField(source='client.fullname')

    class Meta:
        model = Request
        fields = ['id', 'title', 'description', 'category', 'deadline', 'budget', 'status', 'client', 'userName']

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'

class ProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provider
        fields = '__all__'