import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";

const accessRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  company: z
    .string()
    .trim()
    .min(2, "Company must be at least 2 characters")
    .max(100, "Company must be less than 100 characters"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  message: z
    .string()
    .trim()
    .max(500, "Message must be less than 500 characters")
    .optional(),
});

type AccessRequestData = z.infer<typeof accessRequestSchema>;

interface AccessRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccessRequestModal({
  open,
  onOpenChange,
}: AccessRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AccessRequestData>({
    resolver: zodResolver(accessRequestSchema),
  });

  const onSubmit = async (data: AccessRequestData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("access_requests").insert({
        name: data.name.trim(),
        company: data.company.trim(),
        email: data.email.trim().toLowerCase(),
        message: data.message?.trim() || null,
      });

      if (error) {
        throw error;
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting access request:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setTimeout(() => {
        setIsSubmitted(false);
        reset();
      }, 200);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-none border-border">
        {isSubmitted ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-foreground" />
            <DialogTitle className="text-xl font-medium mb-2">
              Thank you
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              We'll be in touch soon.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-medium">
                Request Access
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Tell us about yourself and we'll reach out.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  className="rounded-none border-border focus-visible:ring-ring"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm font-medium">
                  Company
                </Label>
                <Input
                  id="company"
                  placeholder="Your company"
                  className="rounded-none border-border focus-visible:ring-ring"
                  {...register("company")}
                />
                {errors.company && (
                  <p className="text-sm text-destructive">
                    {errors.company.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="rounded-none border-border focus-visible:ring-ring"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">
                  Message{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="message"
                  placeholder="Tell us about your use case..."
                  className="rounded-none border-border focus-visible:ring-ring resize-none"
                  rows={3}
                  {...register("message")}
                />
                {errors.message && (
                  <p className="text-sm text-destructive">
                    {errors.message.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-none bg-foreground text-background hover:bg-foreground/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
