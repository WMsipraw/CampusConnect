# core/views.py
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import User, Request, Booking, Provider
from .serializers import UserSerializer, RequestSerializer, BookingSerializer, ProviderSerializer

# Handles User Registrations
class RegisterView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered securely"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Handles User Logins securely
class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        try:
            user = User.objects.get(email=email)
            if user.check_password(password): # Securely verifies hashed password
                return Response({
                    "id": user.id,
                    "fullname": user.fullname,
                    "email": user.email,
                    "universityId": user.university_id
                }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            pass
            
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

# Handles all Request operations (GET, POST, PATCH, DELETE)
class RequestViewSet(viewsets.ModelViewSet):
    queryset = Request.objects.all().order_by('-id')
    serializer_class = RequestSerializer

# Handles Booking operations with strict multi-layered safety checks
class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer

    def create(self, request, *args, **kwargs):
        request_id = request.data.get('request')
        provider_id = request.data.get('provider')
        
        try:
            target_request = Request.objects.get(id=request_id)
            
            # Security Shield 1: Stop clients from bidding on their own request
            if target_request.client_id == provider_id:
                return Response(
                    {"error": "Security Warning: You cannot bid on your own requests."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Security Shield 2: Stop providers from submitting multiple duplicate bids on the same request
            if Booking.objects.filter(request_id=request_id, provider_id=provider_id).exists():
                return Response(
                    {"error": "Security Restriction: You have already submitted an active offer for this request."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Request.DoesNotExist:
            return Response({"error": "Request does not exist"}, status=status.HTTP_404_NOT_FOUND)
            
        return super().create(request, *args, **kwargs)

# Handles Provider operations with dynamic category filtering
class ProviderViewSet(viewsets.ModelViewSet):
    serializer_class = ProviderSerializer

    def get_queryset(self):
        queryset = Provider.objects.all()
        category = self.request.query_params.get('category')
        if category is not None:
            queryset = queryset.filter(category=category)
        return queryset