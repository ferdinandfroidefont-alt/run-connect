import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-[125] bg-black/45 dark:bg-black/65 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideCloseButton?: boolean;
  fullScreen?: boolean;
  /** Sans zoom d’ouverture (évite flou image sur certains WebKit après animate-in). */
  noZoom?: boolean;
  /** Classes additionnelles sur le bouton fermer (ex. décalage horizontal iPhone). */
  closeButtonClassName?: string;
  /**
   * Au-dessus du chrome app (tab bar z~120) : ouvert depuis un autre dialog.
   * Monte overlay + contenu en z-[130] pour que les clics et le voile passent devant.
   */
  stackNested?: boolean;
  /** Surcharge du voile (ex. plein écran story : fond noir opaque). */
  overlayClassName?: string;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps>(
  ({ className, children, hideCloseButton = false, fullScreen = false, noZoom = false, closeButtonClassName, stackNested = false, overlayClassName, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay className={cn(stackNested && "z-[130]", overlayClassName)} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          fullScreen
            ? cn(
                /* `!fixed` : le className appelant ne doit pas pouvoir remplacer `fixed` (ex. `relative` pour un sticky interne) sinon le voile s’affiche sans panneau. */
                "!fixed inset-0 z-[125] flex h-full w-full flex-col bg-background",
                stackNested && "!z-[130]"
              )
            : cn(
                "fixed left-1/2 top-1/2 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 bg-background duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 rounded-ios-lg max-h-[90vh] overflow-y-auto ios-surface",
                noZoom
                  ? ""
                  : "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                stackNested ? "z-[130]" : "z-[125]"
              ),
          className
        )}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-ios-3 top-ios-3 rounded-full p-ios-1 text-muted-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              closeButtonClassName
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
<div className={cn("flex flex-col space-y-ios-2 text-center sm:text-left", className)} {...props} />;

DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
<div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-ios-2", className)} {...props} />;

DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) =>
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-ios-headline font-semibold leading-tight text-foreground", className)}
    {...props} />

);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(
  ({ className, ...props }, ref) =>
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-ios-subheadline text-muted-foreground", className)}
    {...props} />

);
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription };