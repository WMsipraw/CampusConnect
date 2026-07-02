# core/serializers.py
from rest_framework import serializers
from .models import User, Request, Booking, Provider

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'fullname', 'email', 'university_id', 'password', 'username']
        extra_kwargs = {
            'password': {'write_only': True},
            'username': {'required': False}
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        email = validated_data.get('email')
        fullname = validated_data.get('fullname')
        university_id = validated_data.get('university_id')
        
        # Explicitly pass required arguments to avoid keyword conflicts
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            fullname=fullname,
            university_id=university_id
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