import { use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link2, Smartphone, BarChart3, QrCode } from 'lucide-react';
import { useTranslations, Locale } from '@/i18n';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations(locale as Locale);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">shorly</h1>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost">{t.common.login}</Button>
            <Button>{t.common.getStarted}</Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-5xl font-bold tracking-tight mb-6">
            {t.home.title}
            <br />
            <span className="text-primary">{t.home.subtitle}</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">{t.home.description}</p>
          <div className="flex gap-4 justify-center">
            <Button size="lg">{t.common.startFreeTrial}</Button>
            <Button size="lg" variant="outline">
              {t.common.viewDemo}
            </Button>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <Link2 className="h-10 w-10 text-primary mb-2" />
                <CardTitle>{t.home.features.shortLinks.title}</CardTitle>
                <CardDescription>{t.home.features.shortLinks.description}</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Smartphone className="h-10 w-10 text-primary mb-2" />
                <CardTitle>{t.home.features.oneLinks.title}</CardTitle>
                <CardDescription>{t.home.features.oneLinks.description}</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-primary mb-2" />
                <CardTitle>{t.home.features.analytics.title}</CardTitle>
                <CardDescription>{t.home.features.analytics.description}</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <QrCode className="h-10 w-10 text-primary mb-2" />
                <CardTitle>{t.home.features.qrCodes.title}</CardTitle>
                <CardDescription>{t.home.features.qrCodes.description}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20 bg-muted/30 rounded-3xl">
          <div className="text-center">
            <h3 className="text-3xl font-bold mb-4">{t.home.cta.title}</h3>
            <p className="text-muted-foreground mb-8">{t.home.cta.description}</p>
            <Button size="lg">{t.common.createAccount}</Button>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-12 mt-20 border-t">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{t.home.footer.copyright}</p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              {t.common.privacy}
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              {t.common.terms}
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              {t.common.docs}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
