import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Shield, Brain, ArrowRight, Sparkles } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const blobVariants = {
    animate: {
      x: [0, 100, 0],
      y: [0, -100, 0],
      scale: [1, 1.2, 1],
      transition: {
        duration: 20,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-claimwise relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 -left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
          variants={blobVariants}
          animate="animate"
        />
        <motion.div
          className="absolute top-1/2 -right-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"
          variants={{
            animate: {
              x: [0, -100, 0],
              y: [0, 100, 0],
              scale: [1, 1.3, 1],
              transition: {
                duration: 25,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              },
            },
          }}
          animate="animate"
        />
        <motion.div
          className="absolute bottom-0 left-1/3 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
          variants={{
            animate: {
              x: [0, 150, 0],
              y: [0, -50, 0],
              scale: [1, 1.1, 1],
              transition: {
                duration: 30,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 4,
              },
            },
          }}
          animate="animate"
        />
      </div>

      {/* Main Content */}
      <motion.div
        className="relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-4 py-20">
          <div className="max-w-6xl w-full">
            <motion.div className="text-center mb-12" variants={itemVariants}>
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
                <span className="text-sm text-foreground font-medium">
                  Real-Time AI Claims Triage
                </span>
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
                variants={itemVariants}
              >
                <span className="text-foreground">Transform Claims Chaos</span>
                <br />
                <span className="text-foreground">Into </span>
                <span className="text-gradient-neon">Instant Intelligence</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="text-lg md:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
                variants={itemVariants}
              >
                Stop wasting 40% of adjuster time on manual routing. ClaimWise uses AI
                to classify, detect fraud, and route insurance claims in real-time—cutting
                triage delays from days to seconds.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
                variants={itemVariants}
              >
                <motion.button
                  onClick={() => navigate("/upload")}
                  className="btn-neon px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg text-lg relative overflow-hidden group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    User
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </motion.button>
                <motion.button
                  onClick={() => navigate("/team")}
                  className="px-8 py-4 border-2 border-cyan-400 text-cyan-400 font-semibold rounded-lg hover:bg-cyan-400/10 transition-all duration-200 text-lg relative overflow-hidden group"
                  whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(34, 211, 238, 0.6)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Team
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 py-20 relative z-10">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-16"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                Built for Speed. Powered by Intelligence.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Cutting-edge AI technology that transforms how insurance claims are processed,
                analyzed, and routed for maximum efficiency.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1: Real-Time Processing */}
              <motion.div
                className="glass-card p-8 rounded-xl group cursor-pointer"
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-7 h-7 text-yellow-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Real-Time Processing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Process claims instantly with AI-powered classification and routing. 
                  No delays, no waiting—just instant results.
                </p>
              </motion.div>

              {/* Feature 2: AI Fraud Detection */}
              <motion.div
                className="glass-card p-8 rounded-xl group cursor-pointer"
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400/20 to-cyan-600/20 border border-cyan-400/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">AI Fraud Detection</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Advanced machine learning models detect fraudulent patterns before they
                  impact your bottom line.
                </p>
              </motion.div>

              {/* Feature 3: Adaptive Learning */}
              <motion.div
                className="glass-card p-8 rounded-xl group cursor-pointer"
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-400/20 to-pink-600/20 border border-pink-400/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Brain className="w-7 h-7 text-pink-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Adaptive Learning</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our AI continuously learns from your data, improving accuracy and
                  efficiency with every claim processed.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              className="glass-card p-12 md:p-16 rounded-2xl relative overflow-hidden"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {/* Animated Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 animate-pulse-glow" />
              
              <div className="relative z-10">
                <motion.h2
                  className="text-4xl md:text-5xl font-bold mb-6 text-foreground"
                  variants={itemVariants}
                >
                  Elevate Your Claims Workflow
                </motion.h2>
                <motion.p
                  className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
                  variants={itemVariants}
                >
                  Join the future of insurance claims processing. Get started in seconds
                  and experience the power of AI-driven automation.
                </motion.p>
                <motion.div
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                  variants={itemVariants}
                >
                  <motion.button
                    onClick={() => navigate("/upload")}
                    className="btn-neon px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg text-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Start as User
                  </motion.button>
                  <motion.button
                    onClick={() => navigate("/team")}
                    className="px-8 py-4 border-2 border-cyan-400 text-cyan-400 font-semibold rounded-lg hover:bg-cyan-400/10 transition-all duration-200 text-lg"
                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(34, 211, 238, 0.6)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Team Dashboard
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 px-4 py-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © 2025 ClaimWise AI | Built with ❤️ by Team Track 4
              </p>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-muted-foreground">Powered by AI</span>
              </div>
            </div>
          </div>
        </footer>
      </motion.div>
    </div>
  );
};

export default LandingPage;
