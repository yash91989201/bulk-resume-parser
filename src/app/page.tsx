import Link from "next/link";
import Image from "next/image";
// UI
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
// CONSTANTS
import { features, pricingPlans, faqs } from "@/constants";
// ICONS
import { Check, FileText, Upload, Zap, Shield, BarChart } from "lucide-react";
import {
  LoggedInStatus,
  LoggedInStatusSkeleon,
} from "@/components/auth/logged-in-status";
import { Suspense } from "react";

export default function LandingPage() {
  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Header */}
      <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur-sm">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <div className="flex items-center space-x-2">
            <FileText className="text-primary h-6 w-6" />
            <span className="font-display text-xl font-bold">ResumeParser</span>
          </div>
          <nav className="hidden flex-1 items-center justify-center space-x-8 md:flex">
            <Link
              href="#features"
              className="hover:text-primary text-sm font-medium transition-colors"
            >
              Features
            </Link>
            <Link
              href="#demo"
              className="hover:text-primary text-sm font-medium transition-colors"
            >
              Demo
            </Link>
            <Link
              href="#pricing"
              className="hover:text-primary text-sm font-medium transition-colors"
            >
              Pricing
            </Link>
          </nav>

          <Suspense fallback={<LoggedInStatusSkeleon />}>
            <LoggedInStatus />
          </Suspense>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-12 md:px-6 md:py-24 lg:py-32">
        <div className="container mx-auto flex flex-col items-center gap-8 lg:flex-row lg:gap-12">
          <div className="animate-fade-up flex flex-1 flex-col items-center space-y-4 text-center lg:items-start lg:text-left">
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Transform Resume Data into
                <span className="text-primary"> Actionable Insights</span>
              </h1>
              <p className="text-muted-foreground mx-auto max-w-[700px] font-sans md:text-xl lg:mx-0">
                Bulk parse resumes in multiple formats. Extract structured data
                instantly with AI-powered analysis.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button className="bg-primary hover:bg-primary/90">
                Start Free Trial
              </Button>
              <Button variant="outline">Learn More</Button>
            </div>
          </div>
          <div className="animate-float w-full max-w-xl flex-1">
            <div className="relative aspect-square w-full">
              <div className="absolute inset-0 animate-pulse rounded-full bg-linear-to-r from-blue-500/30 to-purple-500/30 blur-3xl"></div>
              <Image
                src="/assets/placeholder.svg?height=400&width=400"
                alt="Abstract technology visualization"
                width={400}
                height={400}
                className="relative z-10 h-full w-full rounded-2xl object-cover shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white px-4 py-12 md:px-6">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="font-display mb-4 text-3xl font-bold tracking-tighter sm:text-4xl">
              Powerful Features
            </h2>
            <p className="text-muted-foreground mx-auto max-w-[600px]">
              Everything you need to streamline your resume processing workflow
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="animate-fade-up transform transition-all hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <feature.icon className="text-accent h-5 w-5" />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>{feature.description}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="px-4 py-12 md:px-6">
        <div className="container mx-auto grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4 text-center lg:text-left">
            <div className="bg-primary/10 text-primary mb-2 inline-block rounded-lg px-3 py-1 text-sm font-medium">
              Try it yourself
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              See the Magic in Action
            </h2>
            <p className="text-muted-foreground max-w-[600px] md:text-xl">
              Experience firsthand how ResumeParser transforms your resume data
              into structured, actionable insights in seconds.
            </p>
            <ul className="text-muted-foreground space-y-3">
              <li className="flex items-center gap-2">
                <Check className="text-accent h-5 w-5" />
                Instant parsing and analysis
              </li>
              <li className="flex items-center gap-2">
                <Check className="text-accent h-5 w-5" />
                Support for PDF, DOCX, and images
              </li>
              <li className="flex items-center gap-2">
                <Check className="text-accent h-5 w-5" />
                Free demo, no signup required
              </li>
            </ul>
          </div>
          <div className="relative">
            <div className="from-primary/5 to-accent/5 absolute inset-0 -rotate-1 transform rounded-2xl bg-linear-to-r"></div>
            <Card className="relative transform transition-all hover:scale-[1.01]">
              <CardHeader>
                <CardTitle className="font-display">
                  Upload Your Resume
                </CardTitle>
                <CardDescription>Try it with any resume format</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="hover:border-primary cursor-pointer rounded-xl border-2 border-dashed border-gray-200 bg-white/50 p-8 text-center transition-all duration-300 hover:shadow-lg">
                  <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                    <Upload className="text-primary h-8 w-8" />
                  </div>
                  <p className="text-muted-foreground mb-2 text-sm">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    Supported formats: PDF, DOCX, JPG, PNG
                  </p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 w-full">
                  Process Resume
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-white px-4 py-12 md:px-6">
        <div className="container mx-auto">
          <div className="mb-12 flex flex-col items-center space-y-4 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground mx-auto max-w-[700px] md:text-xl">
              Choose the plan that best fits your needs
            </p>
          </div>
          <div className="animate-fade-up grid gap-8 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.title}
                className={`transform transition-all hover:scale-105 ${plan.highlighted ? "border-primary" : ""}`}
              >
                <CardHeader>
                  <CardTitle className="font-display">{plan.title}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="font-display text-3xl font-bold">
                    {plan.price}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="text-accent mr-2 h-4 w-4" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="bg-primary hover:bg-primary/90 w-full">
                    {plan.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-linear-to-b from-white to-gray-50 px-4 py-12 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="font-display mb-12 text-center text-3xl font-bold tracking-tighter sm:text-4xl">
            Why Choose ResumeParser?
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="group relative">
              <div className="from-primary/10 to-accent/10 absolute inset-0 -rotate-1 rounded-2xl bg-linear-to-r transition-transform duration-300 group-hover:rotate-0"></div>
              <div className="relative rounded-2xl bg-white p-6 shadow-xs transition-shadow hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-lg p-3">
                    <Zap className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display mb-2 text-xl font-semibold">
                      Lightning Fast Processing
                    </h3>
                    <p className="text-muted-foreground">
                      Our AI-powered engine processes thousands of resumes in
                      minutes, saving you countless hours of manual work.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="from-primary/10 to-accent/10 absolute inset-0 rotate-1 rounded-2xl bg-linear-to-r transition-transform duration-300 group-hover:rotate-0"></div>
              <div className="relative rounded-2xl bg-white p-6 shadow-xs transition-shadow hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-lg p-3">
                    <Shield className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display mb-2 text-xl font-semibold">
                      Enterprise-Grade Security
                    </h3>
                    <p className="text-muted-foreground">
                      Your data is protected with state-of-the-art encryption
                      and security measures, ensuring complete privacy.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="from-primary/10 to-accent/10 absolute inset-0 rotate-1 rounded-2xl bg-linear-to-r transition-transform duration-300 group-hover:rotate-0"></div>
              <div className="relative rounded-2xl bg-white p-6 shadow-xs transition-shadow hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-lg p-3">
                    <BarChart className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display mb-2 text-xl font-semibold">
                      Detailed Analytics
                    </h3>
                    <p className="text-muted-foreground">
                      Gain valuable insights into your recruitment data with
                      comprehensive analytics and reporting tools.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="from-primary/10 to-accent/10 absolute inset-0 -rotate-1 rounded-2xl bg-linear-to-r transition-transform duration-300 group-hover:rotate-0"></div>
              <div className="relative rounded-2xl bg-white p-6 shadow-xs transition-shadow hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-lg p-3">
                    <FileText className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display mb-2 text-xl font-semibold">
                      Format Flexibility
                    </h3>
                    <p className="text-muted-foreground">
                      Support for all major file formats ensures you can process
                      any resume that comes your way.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="animate-fade-up text-muted-foreground mx-auto max-w-3xl leading-relaxed">
              Whether you&apos;re a small business or a large enterprise, our
              scalable solution adapts to your needs while maintaining the
              highest standards of data security and privacy. Join thousands of
              companies that trust ResumeParser for their recruitment needs.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12 md:px-6">
        <div className="bg-primary rounded-lg p-8 text-white md:p-12">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tighter sm:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-100">
              Join thousands of companies that trust ResumeParser for their
              recruitment needs.
            </p>
            <Button variant="secondary" size="lg">
              Start Your Free Trial
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white px-4 py-12 md:px-6">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-display mb-12 text-center text-3xl font-bold tracking-tighter sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index + 1}`}>
                <AccordionTrigger className="font-display text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t">
        <div className="container mx-auto px-4 py-8 md:px-6">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="flex items-center space-x-2">
              <FileText className="text-primary h-6 w-6" />
              <span className="font-display text-xl font-bold">
                ResumeParser
              </span>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-4 md:mt-0">
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary text-sm"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary text-sm"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="text-muted-foreground mt-4 text-center text-sm">
            © {new Date().getFullYear()} ResumeParser. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
