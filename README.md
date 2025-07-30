# MatchHub ⚽

A modern web application for organizing and joining local football matches. Built with Next.js, Supabase, and free services only.

![MatchHub Screenshot](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)

## 🌟 Features

- **🏠 Home Page**: Welcome screen with quick access to create and browse matches
- **👤 Authentication**: Secure sign-up/sign-in with Supabase Auth
- **⚽ Create Matches**: Comprehensive form with date/time, location, pricing, and player limits
- **🗺️ Interactive Maps**: Location selection and display using OpenStreetMap + Leaflet.js
- **📋 Browse Matches**: Advanced filtering by date, pitch type, and search functionality
- **📱 Match Details**: Full match information with join/leave functionality
- **👥 Player Management**: Track participants and manage match capacity
- **📊 User Dashboard**: Personal overview of created and joined matches
- **🔒 Route Protection**: Authentication-based access control
- **📱 Mobile-First Design**: Responsive design optimized for all devices

## 🛠️ Tech Stack (100% Free Services)

- **Frontend**: Next.js 15 with App Router + TypeScript
- **Styling**: Tailwind CSS + Lucide React Icons
- **Backend/Database**: Supabase (Postgres + Auth + Real-time)
- **Maps**: OpenStreetMap + Leaflet.js + React-Leaflet
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier)
- Git

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd matchhub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be set up (usually takes 2-3 minutes)
3. Go to **Settings > API** in your Supabase dashboard
4. Copy your **Project URL** and **anon/public key**

### 4. Set up Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Set up Database Schema

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `database-setup.sql` and run it
4. This will create all necessary tables, policies, and triggers

### 6. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application!

## 📁 Project Structure

```
matchhub/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Authentication pages
│   │   ├── create-match/      # Create match page
│   │   ├── matches/           # Match browsing and details
│   │   ├── dashboard/         # User dashboard
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable React components
│   │   ├── Navigation.tsx     # Main navigation
│   │   ├── MatchCard.tsx      # Match display card
│   │   └── MapPicker.tsx      # Location selection map
│   ├── contexts/              # React contexts
│   │   └── AuthContext.tsx    # Authentication context
│   └── lib/                   # Utilities and configurations
│       └── supabase.ts        # Supabase client and types
├── database-setup.sql         # Database schema and policies
└── README.md                  # This file
```

## 🗄️ Database Schema

The application uses the following main tables:

- **matches**: Store match information, location, pricing, etc.
- **match_participants**: Track which users joined which matches
- **user_profiles**: Extended user information (auto-created on signup)

See `database-setup.sql` for the complete schema with indexes, policies, and triggers.

## 🔧 Key Features Explained

### Authentication Flow
- Powered by Supabase Auth
- Automatic user profile creation on signup
- Route protection for authenticated pages
- Persistent sessions with auto-refresh

### Match Creation
- Interactive map for location selection
- Reverse geocoding for address display
- Form validation with Zod
- Automatic organizer participation

### Real-time Updates
- Player count automatically updates when users join/leave
- Database triggers maintain data consistency
- Row Level Security (RLS) for data protection

### Maps Integration
- OpenStreetMap tiles (no API key required)
- Leaflet.js for interactive maps
- Click-to-select location functionality
- Reverse geocoding via Nominatim API

## 🛡️ Security Features

- Row Level Security (RLS) enabled on all tables
- Users can only modify their own data
- Match organizers have additional permissions
- SQL injection protection via Supabase client
- XSS protection via React's built-in sanitization

## 📱 Mobile Responsiveness

- Mobile-first design approach
- Touch-friendly interface elements
- Responsive navigation with mobile menu
- Optimized map interactions for touch devices

## 🚀 Deployment

### Deploy on Vercel (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Deploy on Netlify

1. Build the project: `npm run build`
2. Upload the `out` folder to Netlify
3. Set environment variables in Netlify dashboard

### Other Platforms

The app can be deployed on any platform that supports Next.js applications.

## 🎨 Customization

### Styling
- Modify `tailwind.config.js` to customize colors and design tokens
- Update `src/app/globals.css` for global styles
- Component styles are inline with Tailwind classes

### Features
- Add new match types in `src/lib/supabase.ts`
- Extend user profiles in the database schema
- Add new filters in the matches page

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Create a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/your-repo/issues) section
2. Ensure your Supabase setup is correct
3. Verify environment variables are set properly
4. Check browser console for error messages

## 🎯 Roadmap

Future enhancements could include:

- [ ] Email notifications for match updates
- [ ] Weather integration for match days
- [ ] Team/group management
- [ ] Match ratings and reviews
- [ ] Tournament bracket system
- [ ] Social media integration
- [ ] Advanced analytics dashboard

---

**Built with ❤️ using only free and open-source services**
