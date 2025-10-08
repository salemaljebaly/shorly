'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Link2, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(data);

      setEmailSent(true);
      toast.success('Password reset email sent!');
    } catch (error) {
      toast.error((error as any)?.response?.data?.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Link2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Shorly</span>
          </div>
          <CardTitle className="text-2xl text-center">Forgot password?</CardTitle>
          <CardDescription className="text-center">
            {emailSent
              ? 'Check your email for reset instructions'
              : 'Enter your email to receive reset instructions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <Alert>
              <AlertDescription>
                We&apos;ve sent a password reset link to <strong>{form.getValues('email')}</strong>.
                Please check your inbox and follow the instructions to reset your password.
              </AlertDescription>
            </Alert>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center">
            <Link
              href="/login"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to login
            </Link>
          </div>
          {emailSent && (
            <div className="text-sm text-center text-muted-foreground">
              Didn&apos;t receive the email?{' '}
              <button
                onClick={() => {
                  setEmailSent(false);
                  form.reset();
                }}
                className="text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
