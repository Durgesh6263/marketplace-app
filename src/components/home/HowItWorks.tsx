import { motion } from "framer-motion";
import { Search, CreditCard, Download } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Step 1",
    subtitle: "Browse & Discover",
    description: "Explore our collection. Filter by category or keyword to find the perfect project.",
  },
  {
    icon: CreditCard,
    title: "Step 2",
    subtitle: "Purchase Securely",
    description: "Select a project that meets your needs. Pay securely via Razorpay payment gateway.",
  },
  {
    icon: Download,
    title: "Step 3",
    subtitle: "Download & Build",
    description: "Complete your purchase, get instant access, and download your project files.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="font-display text-3xl font-bold text-foreground">
            How it <span className="text-gradient-green">works</span>
          </h2>
          <p className="mt-2 text-muted-foreground">Get started in three simple steps</p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="card-hover group rounded-xl border border-border bg-card p-6 space-y-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:glow-green-sm transition-all">
                <step.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">{step.title}</p>
                <h3 className="font-display text-xl font-semibold text-foreground mt-1">
                  {step.subtitle}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
