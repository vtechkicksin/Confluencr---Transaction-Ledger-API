export default class Money {
  static hasValidScale(value: number): boolean {
    const scaled = value * 100;
    return Math.abs(scaled - Math.round(scaled)) < 1e-6;
  }

  static toMinor(major: number): number {
    return Math.round(major * 100);
  }

  static toMajor(minor: number): number {
    return minor / 100;
  }
}
