/**
 * Formats a date string into a human-readable relative time or date format
 * @param date - ISO date string to format
 * @returns Formatted date string (e.g., "just now", "1 hour ago", "2 hours ago", "yesterday", "3 days ago", "Jan 15", "Jan 2024")
 */
export function timeAgo(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  // Future dates
  if (diffInSeconds < 0) {
    return "in the future";
  }

  // Just now
  if (diffInSeconds < 60) {
    return "just now";
  }

  // Minutes
  if (diffInMinutes < 60) {
    return diffInMinutes === 1
      ? "1 minute ago"
      : `${diffInMinutes} minutes ago`;
  }

  // Hours
  if (diffInHours < 24) {
    return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
  }

  // Days
  if (diffInDays === 1) {
    return "yesterday";
  }

  // Weeks
  if (diffInWeeks === 1) {
    return "last week";
  }
  if (diffInWeeks > 1 && diffInWeeks < 4) {
    return `${diffInWeeks} weeks ago`;
  }

  // Months
  if (diffInMonths === 1) {
    return "last month";
  }
  if (diffInMonths > 1 && diffInMonths < 12) {
    return `${diffInMonths} months ago`;
  }

  // Years
  if (diffInYears === 1) {
    return "last year";
  }
  if (diffInYears > 1) {
    return `${diffInYears} years ago`;
  }

  // Default to date format
  if (diffInDays < 365) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
