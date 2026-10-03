import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode }
interface State { failed: boolean }

class PaymentResultErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Payment result rendering failed", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen bg-background px-4 flex items-center justify-center" dir="auto">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">تعذر عرض نتيجة العملية / Unable to display the result</h1>
          <p className="text-sm text-muted-foreground">تم حفظ العملية. أعد تحميل الصفحة للمتابعة. / Your transaction is saved. Reload to continue.</p>
          <Button className="w-full" onClick={() => window.location.reload()}>إعادة التحميل / Reload</Button>
        </div>
      </div>
    );
  }
}

export default PaymentResultErrorBoundary;