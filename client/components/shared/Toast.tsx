import { Toaster } from "sonner";

const Toast = () => {
  return (
    <Toaster
      position="top-right"
      theme="dark"
      toastOptions={{
        classNames: {
          toast: "bg-card border border-border text-foreground",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-secondary text-secondary-foreground",
        },
      }}
    />
  );
};

export default Toast;
