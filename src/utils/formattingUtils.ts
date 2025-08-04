export const formatTimestamp = (timestamp: Date | string) => {
  try {
    // Ensure timestamp is a valid Date object
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Check if the message is from before today
    const isBeforeToday = messageDate < today;

    const timeFormat = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);

    if (isBeforeToday) {
      const dateFormat = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(date);
      return `${dateFormat} ${timeFormat}`;
    }

    return timeFormat;
  } catch (error) {
    console.error("Error formatting timestamp:", error, timestamp);
    return "Invalid date";
  }
};

export const formatUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + urlObj.pathname;
  } catch {
    return url;
  }
};
