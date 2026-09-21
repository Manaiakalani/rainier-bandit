export class SpeechBubble {
  private el: HTMLElement;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  private reduceMotion: boolean;

  constructor(elementId: string, reduceMotion = false) {
    const el = document.getElementById(elementId);
    if (!el) {
      throw new Error(`Speech bubble element #${elementId} is missing`);
    }
    this.el = el;
    this.reduceMotion = reduceMotion;
  }

  setReducedMotion(enabled: boolean): void {
    this.reduceMotion = enabled;
  }

  show(message: string, durationMs = 4000): void {
    this.clearTimers();

    this.el.textContent = message;
    this.el.hidden = false;
    this.el.style.display = 'block';

    if (this.reduceMotion) {
      this.el.style.transition = 'none';
      this.el.style.opacity = '1';
      this.el.style.transform = 'translateX(-50%) translateY(0)';
    } else {
      this.el.style.opacity = '0';
      this.el.style.transform = 'translateX(-50%) translateY(6px)';
      requestAnimationFrame(() => {
        this.el.style.transition = 'opacity 180ms ease-out, transform 180ms ease-out';
        this.el.style.opacity = '1';
        this.el.style.transform = 'translateX(-50%) translateY(0)';
      });
    }

    this.hideTimer = setTimeout(() => this.hide(), durationMs);
  }

  hide(): void {
    this.clearTimers();
    if (this.reduceMotion) {
      this.el.style.display = 'none';
      this.el.hidden = true;
      return;
    }
    this.el.style.transition = 'opacity 220ms ease-out, transform 220ms ease-out';
    this.el.style.opacity = '0';
    this.el.style.transform = 'translateX(-50%) translateY(6px)';
    this.fadeTimer = setTimeout(() => {
      this.el.style.display = 'none';
      this.el.hidden = true;
    }, 220);
  }

  private clearTimers(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
  }
}
