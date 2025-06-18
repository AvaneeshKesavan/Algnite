// Prevent past dates and times
const dateInput = document.getElementById('dateInput');
const timeInput = document.getElementById('timeInput');
const today = new Date().toISOString().split('T')[0];
dateInput.min = today;

dateInput.addEventListener('change', () => {
    const selectedDate = dateInput.value;
    const now = new Date();
    const selected = new Date(selectedDate);

    if (selected.toDateString() === now.toDateString()) {
        const currentTime = now.toTimeString().slice(0, 5);
        timeInput.min = currentTime;
    } else {
        timeInput.min = "00:00";
    }
});

const successMsg = document.getElementById('successMessage').dataset.msg;
if (successMsg) {
    alert(successMsg);
}