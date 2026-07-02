# core/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate # Safe standard Django authentication
from .models import User, Request, Booking, Provider
from .serializers import UserSerializer, RequestSerializer, BookingSerializer, ProviderSerializer
from .permissions import IsAdminOrReadOnly, IsOwnerOrAdmin
from django.contrib.auth.decorators import login_required
from django.shortcuts import render

# Handles User Registrations
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny] # Exclude from global authentication requirement
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered securely"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Handles User Logins securely (Direct Bulletproof Lookup & Verification)
# core/views.py

class LoginView(APIView):
    permission_classes = [permissions.AllowAny] # Exclude from global authentication requirement
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Case-insensitive lookup
            user = User.objects.filter(email__iexact=email).first() or \
                   User.objects.filter(username__iexact=email).first()
            
            # --- DEVELOPER DIAGNOSTICS LOGGING ---
            print("\n" + "="*50)
            print("[LOGIN DIAGNOSTIC]")
            print(f"  -> Submitted Email/ID: '{email}'")
            print(f"  -> Submitted Password Length: {len(password) if password else 0} chars")
            
            if user:
                print(f"  -> Database Match Found: '{user.email}' (ID: {user.id})")
                is_match = user.check_password(password)
                print(f"  -> Password Match Status: {'SUCCESS' if is_match else 'FAILED (Incorrect Password)'}")
            else:
                print("  -> Database Match Found: NO MATCH (Email does not exist in DB)")
            print("="*50 + "\n")
            # -------------------------------------

        except Exception as e:
            return Response({"error": f"Database lookup failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        # Verify user exists and check credentials
        if user is not None and user.check_password(password):
            if not user.is_active:
                return Response({"error": "This account has been deactivated."}, status=status.HTTP_403_FORBIDDEN)
            
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                "token": token.key,
                "id": user.id,
                "fullname": user.fullname,
                "email": user.email,
                "universityId": user.university_id,
                "isAdmin": user.is_staff or user.is_superuser
            }, status=status.HTTP_200_OK)
            
        return Response({"error": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)

# Handles all Request operations (GET, POST, PATCH, DELETE)
class RequestViewSet(viewsets.ModelViewSet):
    serializer_class = RequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        queryset = Request.objects.all().order_by('-id')
        client_id = self.request.query_params.get('client')
        if client_id is not None:
            queryset = queryset.filter(client_id=client_id)
        return queryset

    def perform_create(self, serializer):
        # Security Shield: enforce authenticated client user to prevent client ID spoofing
        serializer.save(client=self.request.user)

# Handles Booking operations with strict multi-layered safety checks
class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        """
        Overridden to support dynamic filtering of bookings by request 
        and/or provider via API query parameters.
        """
        queryset = Booking.objects.all()
        request_id = self.request.query_params.get('request')
        provider_id = self.request.query_params.get('provider')
        
        if request_id is not None:
            queryset = queryset.filter(request_id=request_id)
        if provider_id is not None:
            queryset = queryset.filter(provider_id=provider_id)
            
        return queryset

    def create(self, request, *args, **kwargs):
        request_id = request.data.get('request')
        # Securely use request.user instead of trusting any provider ID sent from client
        provider = request.user
        
        try:
            target_request = Request.objects.get(id=request_id)
            
            # Security Shield 1: Stop clients from bidding on their own request
            if target_request.client_id == provider.id:
                return Response(
                    {"error": "Security Warning: You cannot bid on your own requests."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Security Shield 2: Stop providers from submitting multiple duplicate bids on the same request
            if Booking.objects.filter(request_id=request_id, provider=provider).exists():
                return Response(
                    {"error": "Security Restriction: You have already submitted an active offer for this request."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Request.DoesNotExist:
            return Response({"error": "Request does not exist"}, status=status.HTTP_404_NOT_FOUND)
            
        data = request.data.copy()
        data['provider'] = provider.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

# Handles Provider operations with dynamic category filtering
class ProviderViewSet(viewsets.ModelViewSet):
    serializer_class = ProviderSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Provider.objects.all()
        category = self.request.query_params.get('category')
        if category is not None:
            queryset = queryset.filter(category=category)
        return queryset

@login_required(login_url='/login/')
def admin_view(request):
    return render(request, 'admin.html')

def how_it_works_view(request):
    return render(request, 'how-it-works.html')

def explore_view(request):
    return render(request, 'explore.html')