(function () {
  function maskPhone(value) {
    var digits = value.replace(/\D/g, "");
    if (digits.charAt(0) === "8") digits = "7" + digits.slice(1);
    if (digits && digits.charAt(0) !== "7") digits = "7" + digits;
    digits = digits.slice(0, 11);
    var text = "+7";
    if (digits.length > 1) text += " (" + digits.slice(1, 4);
    if (digits.length >= 4) text += ")";
    if (digits.length > 4) text += " " + digits.slice(4, 7);
    if (digits.length > 7) text += "-" + digits.slice(7, 9);
    if (digits.length > 9) text += "-" + digits.slice(9, 11);
    return { text: text, digits: digits };
  }

  document.addEventListener("input", function (event) {
    var input = event.target;
    if (!input.matches || !input.matches("[data-phone]")) return;
    var masked = maskPhone(input.value);
    input.value = masked.text;
  });

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!form.matches || !form.matches("[data-form]")) return;
    event.preventDefault();
    submitForm(form);
  });

  function fieldValue(form, name) {
    var field = form.elements[name];
    return field ? String(field.value || "").trim() : "";
  }

  function showError(form, show) {
    form.classList.toggle("form--invalid", show);
    var error = form.querySelector(".form__error");
    Array.prototype.forEach.call(form.querySelectorAll("[required]"), function (field) {
      var invalid = show && ((field.type === "checkbox" && !field.checked) || (field.type !== "checkbox" && !String(field.value || "").trim()));
      field.setAttribute("aria-invalid", invalid ? "true" : "false");
      if (error) {
        if (!error.id) error.id = "error-" + (form.getAttribute("data-form") || "form");
        if (invalid) field.setAttribute("aria-describedby", error.id);
        else field.removeAttribute("aria-describedby");
      }
    });
  }

  function submitForm(form) {
    var error = form.querySelector(".form__error");
    if (error) {
      error.textContent = "Необходимо ваше согласие. Пожалуйста, заполните обязательные поля.";
    }
    var phone = maskPhone(fieldValue(form, "phone"));
    var name = fieldValue(form, "name");
    var vehicle = fieldValue(form, "vehicle");
    var needsName = Boolean(form.elements.name);
    var needsVehicle = Boolean(form.elements.vehicle);
    var consent = form.elements.consent && form.elements.consent.checked;
    var ads = form.elements.ads && form.elements.ads.checked;
    var valid = phone.digits.length === 11 && consent;
    if (needsName) valid = valid && name.length >= 2;
    if (needsVehicle) valid = valid && vehicle.length >= 2;
    showError(form, !valid);
    if (!valid) return;

    var kind = form.getAttribute("data-form");
    var storageKey = "sollers-lead:" + kind + ":" + phone.digits;
    if (window.sessionStorage.getItem(storageKey)) {
      window.Sollers.openPopup("duplicate");
      return;
    }

    var button = form.querySelector("[type='submit']");
    if (button) button.disabled = true;

    var payload = {
      form: kind,
      name: name,
      phone: phone.text,
      vehicle: vehicle,
      model: fieldValue(form, "model"),
      consent: true,
      ads: ads
    };

    fetch("php/send.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        if (!response.ok) throw new Error("status");
        return response.json();
      })
      .then(function (data) {
        if (!data || !data.ok) throw new Error("payload");
        window.sessionStorage.setItem(storageKey, "1");
        form.reset();
        showError(form, false);
        var popup = form.closest(".popup");
        if (popup) window.Sollers.closePopup(popup);
        window.Sollers.openPopup("thanks");
      })
      .catch(function () {
        if (error) {
          error.textContent = "Не удалось отправить заявку. Позвоните нам: +7 (495) 069-07-07.";
        }
        showError(form, true);
      })
      .then(function () {
        if (button) button.disabled = false;
      });
  }
})();
