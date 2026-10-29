export const timeLabel = (value) => {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
};
export const assetUrl = (id) =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/assets/${id}`;
