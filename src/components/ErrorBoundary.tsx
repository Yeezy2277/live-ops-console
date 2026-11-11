import { Component, type ReactNode } from "react";

type Props = { area: string; children: ReactNode };
type State = { error: Error | null };

/**
 * Keeps one failing panel from blanking the whole console: the canvas can
 * throw (no 2D context, a bad frame) while the numbers keep working.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fallback" role="alert">
        <p>
          The {this.props.area} stopped rendering: {this.state.error.message}
        </p>
        <button className="ctl__btn" onClick={() => this.setState({ error: null })}>
          Retry
        </button>
      </div>
    );
  }
}
