# Project Marketplace Database Schema

This document outlines the database schema design for the seller portal, including **Supabase (PostgreSQL)** tables and **Firebase (Cloud Firestore)** collections.

---

## 1. Supabase (PostgreSQL DDL)

### User Roles (`user_roles`)
Stores roles and contact details of users (Admin, Seller, Buyer).
```sql
CREATE TABLE public.user_roles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('user', 'seller', 'admin')) DEFAULT 'user',
    name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read profiles" ON public.user_roles 
    FOR SELECT USING (true);
    
CREATE POLICY "Users edit own profile" ON public.user_roles 
    FOR UPDATE USING (auth.uid() = id);
```

### Projects (`projects`)
Contains listings uploaded by sellers and admins.
```sql
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES public.user_roles(id) ON DELETE SET NULL,
    seller_name TEXT,
    title TEXT NOT NULL,
    short_description TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    project_level TEXT CHECK (project_level IN ('Beginner', 'Intermediate', 'Advanced')) NOT NULL,
    project_type TEXT CHECK (project_type IN ('Mini Project', 'Major Project', 'Final Year Project')) NOT NULL,
    features TEXT[] DEFAULT '{}'::text[],
    tech_stack TEXT[] DEFAULT '{}'::text[],
    demo_video_url TEXT,
    screenshots TEXT[] DEFAULT '{}'::text[],
    source_code_zip TEXT,
    project_report_pdf TEXT,
    installation_guide_pdf TEXT,
    download_url TEXT,
    version TEXT DEFAULT 'v1.0',
    status TEXT CHECK (status IN ('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Suspended')) DEFAULT 'Draft' NOT NULL,
    seller_declaration BOOLEAN DEFAULT FALSE CHECK (seller_declaration = TRUE),
    is_published BOOLEAN DEFAULT FALSE,
    total_sales INT DEFAULT 0,
    rating NUMERIC DEFAULT 0,
    total_ratings INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view approved, published projects" ON public.projects 
    FOR SELECT USING (status = 'Approved' AND is_published = true);

CREATE POLICY "Sellers can view own projects" ON public.projects 
    FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert projects" ON public.projects 
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own projects before approval decisions" ON public.projects 
    FOR UPDATE USING (auth.uid() = seller_id AND status IN ('Draft', 'Submitted', 'Under Review'));

CREATE POLICY "Sellers can delete own projects before approval decisions" ON public.projects 
    FOR DELETE USING (auth.uid() = seller_id AND status IN ('Draft', 'Submitted', 'Under Review'));

CREATE POLICY "Admins have full access" ON public.projects 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

### Orders (`orders`)
Calculates transaction commission splits (40% seller, 60% platform).
```sql
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    project_title TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    seller_id UUID REFERENCES public.user_roles(id) ON DELETE SET NULL,
    seller_earning NUMERIC,
    platform_earning NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Sellers can view own paid orders" ON public.orders 
    FOR SELECT USING (auth.uid() = seller_id AND status = 'paid');

CREATE POLICY "Admins have full access" ON public.orders 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

### Seller Notifications (`seller_notifications`)
```sql
CREATE TABLE public.seller_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES public.user_roles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    project_id UUID,
    project_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

### Seller Payouts (`seller_payouts`)
Stores payout transactions made to sellers.
```sql
CREATE TABLE public.seller_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES public.user_roles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    status TEXT CHECK (status IN ('pending', 'paid')) DEFAULT 'pending' NOT NULL,
    payout_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins have full access on payouts" ON public.seller_payouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Sellers read own payouts" ON public.seller_payouts
    FOR SELECT USING (auth.uid() = seller_id);
```

### Seller Earnings (`seller_earnings`)
Tracks details of seller revenues and commission splits.
```sql
CREATE TABLE public.seller_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES public.user_roles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    units_sold INT DEFAULT 0,
    revenue_generated NUMERIC DEFAULT 0,
    seller_commission NUMERIC DEFAULT 0,
    platform_profit NUMERIC DEFAULT 0,
    payout_status TEXT CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.seller_earnings ENABLE ROW LEVEL SECURITY;
```

```

---

## 2. Firebase Cloud Firestore

### `user_roles/{userId}`
```json
{
  "role": "user | seller | admin",
  "name": "string",
  "phone": "string",
  "email": "string",
  "created_at": "Timestamp"
}
```

### `projects/{projectId}`
```json
{
  "seller_id": "string",
  "seller_name": "string",
  "title": "string",
  "short_description": "string",
  "description": "string",
  "price": 1000,
  "category": "string",
  "project_level": "Beginner | Intermediate | Advanced",
  "project_type": "Mini Project | Major Project | Final Year Project",
  "features": ["string", "string"],
  "tech_stack": ["string", "string"],
  "demo_video_url": "string",
  "screenshots": ["url1", "url2"],
  "source_code_zip": "string",
  "project_report_pdf": "string",
  "installation_guide_pdf": "string",
  "download_url": "string",
  "version": "string",
  "status": "Draft | Submitted | Under Review | Approved | Rejected | Suspended",
  "seller_declaration": true,
  "is_published": false,
  "total_sales": 0,
  "rating": 0,
  "total_ratings": 0,
  "created_at": "Timestamp",
  "updated_at": "Timestamp"
}
```

### `orders/{orderId}`
```json
{
  "project_id": "string",
  "project_title": "string",
  "buyer_name": "string",
  "buyer_email": "string",
  "buyer_phone": "string",
  "amount": 1000,
  "status": "pending | paid",
  "razorpay_order_id": "string",
  "razorpay_payment_id": "string",
  "seller_id": "string",
  "seller_earning": 400,
  "platform_earning": 600,
  "created_at": "Timestamp",
  "updated_at": "Timestamp"
}
```

### `seller_notifications/{notificationId}`
```json
{
  "seller_id": "string",
  "title": "string",
  "message": "string",
  "type": "submitted | approved | rejected | sold",
  "read": false,
  "project_id": "string",
  "project_title": "string",
  "created_at": "Timestamp"
}
```

### `seller_payouts/{payoutId}`
```json
{
  "seller_id": "string",
  "amount": 2500,
  "status": "pending | paid",
  "payout_date": "Timestamp | null",
  "created_at": "Timestamp"
}
```

---

## 3. Firebase Security Rules
We recommend compiling the following rules into your `firestore.rules` file:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User Roles Helper
    function getUserRole(uid) {
      return get(/databases/$(database)/documents/user_roles/$(uid)).data.role;
    }
    
    // User Profiles
    match /user_roles/{userId} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == userId && request.resource.data.role != 'admin';
      allow update: if request.auth != null && (
        (request.auth.uid == userId && request.resource.data.role == resource.data.role) || 
        getUserRole(request.auth.uid) == 'admin'
      );
      allow delete: if request.auth != null && getUserRole(request.auth.uid) == 'admin';
    }

    // Projects
    match /projects/{projectId} {
      allow read: if resource.data.status == 'Approved' 
                  || (request.auth != null && (resource.data.seller_id == request.auth.uid || getUserRole(request.auth.uid) == 'admin'));
      allow create: if request.auth != null && (getUserRole(request.auth.uid) == 'seller' || getUserRole(request.auth.uid) == 'admin');
      allow update, delete: if request.auth != null && (
        getUserRole(request.auth.uid) == 'admin' || 
        (resource.data.seller_id == request.auth.uid && resource.data.status in ['Draft', 'Submitted', 'Under Review'])
      );
    }

    // Orders
    match /orders/{orderId} {
      allow read: if request.auth != null && (resource.data.seller_id == request.auth.uid || getUserRole(request.auth.uid) == 'admin');
      allow create: if true; // Buyers can create orders
      allow update: if request.auth != null && getUserRole(request.auth.uid) == 'admin'; // Server handles payments via API
    }

    // Seller Notifications
    match /seller_notifications/{notificationId} {
      allow read, write: if request.auth != null && resource.data.seller_id == request.auth.uid;
    }

    // Seller Payouts
    match /seller_payouts/{payoutId} {
      allow read: if request.auth != null && (resource.data.seller_id == request.auth.uid || getUserRole(request.auth.uid) == 'admin');
      allow write: if request.auth != null && getUserRole(request.auth.uid) == 'admin';
    }
  }
}
```
