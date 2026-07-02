# core/permissions.py
from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Only allow administrative staff to write data.
    Any authenticated session is allowed to read.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and (request.user.is_staff or request.user.is_superuser)

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Ensures users can only edit or delete their own listings or proposals.
    Any authenticated user is allowed to read (view) them.
    Clients can also edit the booking status if they are the requester.
    Administrators are allowed bypass.
    """
    def has_object_permission(self, request, view, obj):
        # 1. Administrators are allowed bypass
        if request.user and (request.user.is_staff or request.user.is_superuser):
            return True
            
        # 2. Allow any authenticated user to read/retrieve details (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
            
        # --- WRITE ACTIONS CHECK ---
        
        # Requests table ownership
        if hasattr(obj, 'client'):
            return obj.client == request.user
            
        # Bookings table ownership: either the provider of the bid,
        # or the client who posted the original request (so they can accept it)
        if hasattr(obj, 'provider') and obj.provider == request.user:
            return True
            
        if hasattr(obj, 'request') and obj.request.client == request.user:
            return True
            
        return False