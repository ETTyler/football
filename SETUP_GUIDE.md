# 🚀 Quick Setup Guide for MatchHub

Follow these steps to get your MatchHub application running in under 10 minutes!

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization (create one if needed)
4. Enter project details:
   - **Name**: `matchhub` (or any name you prefer)
   - **Database Password**: Generate a strong password and save it
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for setup to complete

## Step 2: Get API Keys

1. In your Supabase dashboard, go to **Settings → API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Project API Keys → anon/public** (long string starting with `eyJ...`)

## Step 3: Set Up Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Set Up Database

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query" 
3. Copy the entire contents of `database-setup.sql` 
4. Paste it into the SQL editor
5. Click "Run" (this creates all tables, policies, and triggers)

## Step 5: Install and Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Step 6: Test the Application

1. Open [http://localhost:3000](http://localhost:3000)
2. Click "Sign Up" to create an account
3. Create your first match
4. Test the map functionality by clicking on it
5. Browse matches and join them

## 🎉 You're Done!

Your MatchHub application is now running with:
- ✅ Authentication system
- ✅ Database with proper security
- ✅ Interactive maps
- ✅ Match creation and joining
- ✅ User dashboard
- ✅ Mobile-responsive design

## 🚀 Deploy to Production

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Netlify
1. Run `npm run build`
2. Upload `out` folder to Netlify
3. Add environment variables
4. Done!

## 🔧 Troubleshooting

**Maps not showing?**
- Clear browser cache and reload

**Authentication not working?**
- Double-check environment variables
- Ensure `.env.local` is in project root

**Database errors?**
- Verify `database-setup.sql` ran successfully
- Check Supabase logs in dashboard

**Need help?**
- Check the main `README.md` for detailed documentation
- All code is well-commented for easy understanding

---

**Happy organizing! ⚽** 