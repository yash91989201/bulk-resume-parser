import {
  FileText,
  Zap,
  Search,
  Shield,
  Database,
  BarChart,
  Download,
  Clock,
} from "lucide-react";

export const features = [
  {
    icon: FileText,
    title: "Multi-Format Support",
    description:
      "Process PDF, Word, and Image files in bulk with ease. Support for all major document formats.",
  },
  {
    icon: Zap,
    title: "AI-Powered Extraction",
    description:
      "Advanced AI algorithms extract precise information from resumes with high accuracy.",
  },
  {
    icon: Search,
    title: "Custom Fields",
    description:
      "Specify exactly what data you want to extract from each resume with custom field mapping.",
  },
  {
    icon: Shield,
    title: "Data Security",
    description:
      "Enterprise-grade security with encryption at rest and in transit for all your sensitive data.",
  },
  {
    icon: Database,
    title: "Batch Processing",
    description:
      "Process thousands of resumes simultaneously with our powerful batch processing engine.",
  },
  {
    icon: BarChart,
    title: "Analytics Dashboard",
    description:
      "Get insights into your recruitment data with our comprehensive analytics dashboard.",
  },
  {
    icon: Download,
    title: "Export Options",
    description:
      "Export parsed data in multiple formats including Excel, CSV, and JSON for easy integration.",
  },
  {
    icon: Clock,
    title: "Fast Processing",
    description:
      "Get results in seconds with our optimized processing engine and distributed architecture.",
  },
] as const;

export const pricingPlans = [
  {
    title: "Starter",
    description: "Perfect for small teams",
    price: "$49/mo",
    features: [
      "100 resumes/month",
      "Basic fields extraction",
      "Excel export",
      "Email support",
    ],
    buttonText: "Get Started",
    highlighted: false,
  },
  {
    title: "Professional",
    description: "For growing businesses",
    price: "$99/mo",
    features: [
      "500 resumes/month",
      "Advanced fields extraction",
      "Excel & API export",
      "Priority support",
      "Custom fields",
    ],
    buttonText: "Get Started",
    highlighted: true,
  },
  {
    title: "Enterprise",
    description: "For large organizations",
    price: "Custom",
    features: [
      "Unlimited resumes",
      "Full API access",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
    buttonText: "Contact Sales",
    highlighted: false,
  },
] as const;

export const faqs = [
  {
    question: "What file formats does ResumeParser support?",
    answer:
      "ResumeParser supports all major file formats including PDF, DOCX, DOC, RTF, TXT, and common image formats (JPG, PNG). Our system can process these formats individually or in bulk, making it flexible for various recruitment needs.",
  },
  {
    question: "How accurate is the information extraction?",
    answer:
      "Our AI-powered engine achieves over 95% accuracy in extracting key information from resumes. The system is continuously trained on diverse resume formats and layouts to ensure high accuracy across different industries and roles.",
  },
  {
    question: "Is my data secure with ResumeParser?",
    answer:
      "Yes, we take data security seriously. All data is encrypted both in transit and at rest. We comply with GDPR and other major data protection regulations. Our systems are regularly audited and we maintain strict access controls.",
  },
  {
    question: "Can I customize the fields to be extracted?",
    answer:
      "Yes, ResumeParser offers customizable field extraction. You can specify exactly what information you want to extract from resumes, including standard fields like contact information and experience, as well as custom fields specific to your needs.",
  },
  {
    question: "How quickly can ResumeParser process resumes?",
    answer:
      "ResumeParser processes single resumes in seconds and can handle bulk processing of thousands of resumes efficiently. Our distributed architecture ensures fast processing times even during high-volume operations.",
  },
  {
    question: "Do you offer integration with ATS systems?",
    answer:
      "Yes, ResumeParser offers seamless integration with major ATS systems through our API. We also provide custom integration solutions for enterprise clients with specific requirements.",
  },
] as const;

export const QUEUES = {
  EXTRACT_ARCHIVE: "extract_archive_queue",
  IMG_TO_TXT: "img_to_txt_queue",
  WORD_TO_TXT: "word_to_txt_queue",
  PDF_TO_TXT: "pdf_to_txt_queue",
  TXT_TO_JSON: "txt_to_json_queue",
  CONVERSION_DIRECTOR: "conversion_director_queue",
} as const;

export const MAX_FILE_SIZE_S3_ENDPOINT = 1000;

export const ACCEPTED_FILE_TYPES = [
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
];

export const ACCEPTED_ARCHIVE_TYPES = [
  "application/zip",
  "application/vnd.rar",
  "application/x-rar",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
];

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/webp",
];

export const ACCEPTED_DOCUMENT_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
