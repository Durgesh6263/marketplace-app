import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Store, Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import ContactFormDialog from "./ContactFormDialog";

const JoinSection = () => {
  const [contactOpen, setContactOpen] = useState(false);

  const roles = [
    {
      icon: Store,
      title: "As a seller",
      description: "Showcase your projects and earn money. Upload once, sell unlimited times.",
      action: "Start Selling",
      to: "/sell-with-us",
      isLink: true,
    },
    {
      icon: Users,
      title: "As a buyer",
      description: "Find high-quality projects tailored for your academic or professional needs.",
      action: "Browse Projects",
      to: "/projects",
      isLink: true,
    },
    {
      icon: Handshake,
      title: "As a team",
      description: "Collaborate with fellow developers by building and sharing projects together.",
      action: "Get in Touch",
      isLink: false,
    },
  ];

  return (
    <>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="font-display text-3xl font-bold text-foreground">
              Join <span className="text-gradient-green">The Last Minute Project</span>
            </h2>
            <p className="mt-2 text-muted-foreground">Whether you build or buy, there's a place for you</p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {roles.map((role, index) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="card-hover group flex flex-col rounded-xl border border-border bg-card p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <role.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">{role.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{role.description}</p>
                <div className="mt-4">
                  {role.isLink ? (
                    <Button variant="outline-glow" size="sm" asChild>
                      <Link to={role.to!}>
                        {role.action} <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline-glow"
                      size="sm"
                      onClick={() => setContactOpen(true)}
                    >
                      {role.action} <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ContactFormDialog open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
};

export default JoinSection;
