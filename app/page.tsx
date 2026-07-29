'use client'

import Header from './components/Header'
import Hero from './components/Hero'
import Features from './components/Features'
import ProductOverview from './components/ProductOverview'
import Intelligence from './components/Intelligence'
import Experience from './components/Experience'
import Testimonials from './components/Testimonials'
import Newsletter from './components/Newsletter'
import Footer from './components/Footer'

// Force dynamic rendering for client-side components
export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <Header />
      <Hero />
      <Features />
      <ProductOverview />
      <Intelligence />
      <Experience />
      <Testimonials />
      <Newsletter />
      <Footer />
    </main>
  )
} 