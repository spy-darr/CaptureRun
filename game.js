export function updateStreak() {
  let today = new Date().toDateString();

  let last = localStorage.getItem("lastPlay");
  let streak = parseInt(localStorage.getItem("streak") || "0");

  if (last === today) return streak;

  let yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (last === yesterday.toDateString()) {
    streak++;
  } else {
    streak = 1;
  }

  localStorage.setItem("lastPlay", today);
  localStorage.setItem("streak", streak);

  return streak;
}

export function getStreak() {
  return parseInt(localStorage.getItem("streak") || "0");
}
