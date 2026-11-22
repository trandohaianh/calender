import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  section?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? `: ${this.props.section}` : ''}]`, error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 p-8 text-center"
          role="alert"
        >
          <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
          <div>
            <h2 className="font-semibold">
              {this.props.section ? `Lỗi: ${this.props.section}` : 'Đã xảy ra lỗi'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              {this.state.message || 'Vui lòng thử tải lại phần này.'}
            </p>
          </div>
          <Button variant="outline" onClick={this.handleReset}>
            Thử lại
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
