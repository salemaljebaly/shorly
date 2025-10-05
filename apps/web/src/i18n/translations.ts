export const translations = {
  en: {
    common: {
      login: 'Login',
      getStarted: 'Get Started',
      startFreeTrial: 'Start Free Trial',
      viewDemo: 'View Demo',
      createAccount: 'Create Your Account',
      privacy: 'Privacy',
      terms: 'Terms',
      docs: 'Docs',
    },
    home: {
      title: 'Global Link Management',
      subtitle: 'Made Simple',
      description:
        'Create short links and OneLinks with device-based routing. Track analytics, generate QR codes, and manage your links globally with multilingual support.',
      features: {
        shortLinks: {
          title: 'Short Links',
          description: 'Create and manage short links with custom codes and analytics',
        },
        oneLinks: {
          title: 'OneLinks',
          description: 'Device-based routing for Android, iOS, and Web with deep linking',
        },
        analytics: {
          title: 'Analytics',
          description: 'Track clicks, devices, countries, and referrers in real-time',
        },
        qrCodes: {
          title: 'QR Codes',
          description: 'Generate dynamic QR codes for any link with customization',
        },
      },
      cta: {
        title: 'Ready to Get Started?',
        description: 'Join thousands managing their links with shorly',
      },
      footer: {
        copyright: '© 2025 shorly. All rights reserved.',
      },
    },
  },
  ar: {
    common: {
      login: 'تسجيل الدخول',
      getStarted: 'ابدأ الآن',
      startFreeTrial: 'ابدأ التجربة المجانية',
      viewDemo: 'عرض توضيحي',
      createAccount: 'إنشاء حسابك',
      privacy: 'الخصوصية',
      terms: 'الشروط',
      docs: 'المستندات',
    },
    home: {
      title: 'إدارة الروابط العالمية',
      subtitle: 'بسيطة وسهلة',
      description:
        'أنشئ روابط قصيرة وروابط ذكية مع التوجيه المبني على الجهاز. تتبع التحليلات، وإنشاء رموز QR، وإدارة الروابط الخاصة بك عالميًا مع دعم متعدد اللغات.',
      features: {
        shortLinks: {
          title: 'روابط قصيرة',
          description: 'إنشاء وإدارة روابط قصيرة مع رموز مخصصة وتحليلات',
        },
        oneLinks: {
          title: 'روابط ذكية',
          description: 'التوجيه المبني على الجهاز لأندرويد وآي أو إس والويب مع الربط العميق',
        },
        analytics: {
          title: 'التحليلات',
          description: 'تتبع النقرات والأجهزة والدول والمراجع في الوقت الفعلي',
        },
        qrCodes: {
          title: 'رموز QR',
          description: 'إنشاء رموز QR ديناميكية لأي رابط مع التخصيص',
        },
      },
      cta: {
        title: 'هل أنت مستعد للبدء؟',
        description: 'انضم إلى الآلاف ممن يديرون روابطهم مع shorly',
      },
      footer: {
        copyright: '© 2025 shorly. جميع الحقوق محفوظة.',
      },
    },
  },
};

export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
