function showForm(formType) {
    document.getElementById('choice-box').style.display = 'none';
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');

    if (formType === 'login') {
        document.getElementById('login-form').classList.remove('hidden');
    } else {
        document.getElementById('register-form').classList.remove('hidden');
    }
}

function handleRegistration(form) {
    const dob = document.getElementById('dob').value;
    if (dob) {
        const birth = new Date(dob);
        const age = Math.floor((new Date() - birth) / (1000 * 60 * 60 * 24 * 365.25));
        document.getElementById('age').value = age;
    }
    return true;
}

function togglePassword(icon) {
    const input = icon.previousElementSibling;
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.textContent = input.type === 'password' ? 'O' : '*';
}

// Automatically show form if showForm is passed from server
const showFormType = "<%= showForm || '' %>";
window.onload = function () {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("dob").max = today;

    if (showFormType) {
        showForm(showFormType);
    }
};