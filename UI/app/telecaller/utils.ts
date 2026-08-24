export const normalizeCourseInterest = (raw: string) => {
  return (raw || "").trim().replace(/([0-9])([A-Z])/g, "$1, $2").replace(/([a-z])([A-Z])/g, "$1, $2")
}
