# core/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser

# 1. Custom User table (Explicitly declaring fullname)
class User(AbstractUser):
    fullname = models.CharField(max_length=255)
    university_id = models.CharField(max_length=50, unique=True)
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'university_id']

# 2. Campus Requests Table
class Request(models.Model):
    CATEGORY_CHOICES = [
        ('Tutoring', 'Tutoring'),
        ('Graphic Design', 'Graphic Design'),
        ('Programming Help', 'Programming Help'),
        ('Laptop Repair', 'Laptop Repair'),
        ('Photography', 'Photography'),
        ('Other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    deadline = models.DateField()
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requests')
    created_at = models.DateTimeField(auto_now_add=True)

# 3. Booking Bids Table
class Booking(models.Model):
    STATUS_CHOICES = [
        ('Pending Client Confirmation', 'Pending Client Confirmation'),
        ('Accepted by Client, Pending Admin Approval', 'Accepted by Client, Pending Admin Approval'),
        ('Approved', 'Approved'),
    ]

    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='bookings')
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='offers')
    message = models.TextField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Pending Client Confirmation')
    created_at = models.DateTimeField(auto_now_add=True)

# 4. Verified Providers Table (Added)
class Provider(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    category = models.CharField(max_length=100)
    availability = models.TextField()

    def __str__(self):
        return self.name