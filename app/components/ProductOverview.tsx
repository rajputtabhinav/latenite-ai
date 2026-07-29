'use client'

import { motion } from 'framer-motion'

export default function ProductOverview() {
  return (
    <section id="product" className="py-20 bg-gray-900">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-white mb-8">
            Latenite AI works with your team
          </h2>
          
          <div className="mb-8">
            <span className="text-primary-orange text-2xl xl:text-3xl 2xl:text-4xl font-semibold">Not instead of it.</span>
            <span className="text-white text-2xl xl:text-3xl 2xl:text-4xl"> By handling repetitive</span>
          </div>
          
          <div className="mb-8">
            <span className="text-white text-2xl xl:text-3xl 2xl:text-4xl">tasks, </span>
            <span className="text-blue-400 text-2xl xl:text-3xl 2xl:text-4xl font-semibold">improving safety, </span>
            <span className="text-white text-2xl xl:text-3xl 2xl:text-4xl">and </span>
            <span className="text-green-400 text-2xl xl:text-3xl 2xl:text-4xl font-semibold">learning from</span>
          </div>
          
          <div className="mb-12">
            <span className="text-purple-400 text-2xl xl:text-3xl 2xl:text-4xl font-semibold">every interaction, </span>
            <span className="text-white text-2xl xl:text-3xl 2xl:text-4xl">Latenite AI helps</span>
          </div>
          
          <p className="text-white text-2xl xl:text-3xl 2xl:text-4xl mb-8">
            developers focus on what they love to
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 text-2xl xl:text-3xl 2xl:text-4xl font-semibold">
            <span className="text-primary-orange">create,</span>
            <span className="text-blue-400">solve,</span>
            <span className="text-white">and</span>
            <span className="text-green-400">innovate.</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 