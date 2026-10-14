(function () {
  var money = new Intl.NumberFormat("ru-RU");

  function formatPrice(value) {
    return money.format(value) + " ₽";
  }

  function formatPayment(raw) {
    if (!raw) return "";
    var digits = String(raw).replace(/\D/g, "");
    if (!digits) return "";
    return "от " + money.format(Number(digits)) + " ₽/мес.";
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function benefitItem(text) {
    var item = el("li", "catalog__benefit");
    var mark = "";
    var href = "";
    if (text.indexOf("0,01%") !== -1) {
      mark = "*";
      href = "#note-1";
    } else if (text.indexOf("3 ТО") !== -1) {
      mark = "**";
      href = "#note-2";
    } else if (text.indexOf("Выгода до 500 000") !== -1) {
      mark = "***";
      href = "#note-3";
    }
    item.appendChild(document.createTextNode(text));
    if (mark) {
      var note = el("a", "note", mark);
      note.href = href;
      item.appendChild(note);
    }
    return item;
  }

  fetch("data/catalog.json")
    .then(function (response) {
      if (!response.ok) throw new Error("catalog");
      return response.json();
    })
    .then(function (models) {
      renderCatalog(models);
      renderTrims(models);
    })
    .catch(function () {
      var list = document.querySelector("[data-catalog-list]");
      if (list) list.appendChild(el("p", "catalog__risk", "Не удалось загрузить модельный ряд."));
    });

  function renderCatalog(models) {
    var list = document.querySelector("[data-catalog-list]");
    var more = document.querySelector("[data-catalog-more]");
    if (!list) return;

    models.forEach(function (model, index) {
      var item = el("li", "catalog__item" + (index >= 4 ? " catalog__item--extra" : ""));
      var card = el("article", "catalog__card");
      var colors = model.colors || [];
      var media = el("div", "catalog__media" + (colors.length > 1 ? " catalog__media--colors" : ""));
      var paint = null;
      if (colors.length > 1) {
        paint = renderColors(model, media);
      } else if (model.image) {
        var photo = el("img", "catalog__photo");
        photo.src = model.image;
        photo.alt = model.name;
        photo.sizes = "(min-width: 800px) 50vw, 100vw";
        media.appendChild(photo);
      } else {
        media.appendChild(el("p", "catalog__placeholder", "Фото " + model.name + " будет добавлено"));
      }

      var body = el("div", "catalog__body");
      body.appendChild(el("h3", "catalog__name", model.name));
      var benefits = el("ul", "catalog__benefits");
      (model.benefits || []).forEach(function (benefit) {
        benefits.appendChild(benefitItem(benefit));
      });
      body.appendChild(benefits);

      var prices = el("div", "catalog__prices");
      prices.appendChild(el("span", "catalog__caption", "Цена в кредит от"));
      if (model.priceOld > model.price) {
        prices.appendChild(el("span", "catalog__old", formatPrice(model.priceOld)));
      }
      prices.appendChild(el("span", "catalog__price", formatPrice(model.price)));
      body.appendChild(prices);

      var payment = formatPayment(model.payment);
      if (payment) {
        var pay = el("p", "catalog__payment");
        pay.appendChild(document.createTextNode(payment + " "));
        var note = el("a", "note", "*");
        note.href = "#note-1";
        pay.appendChild(note);
        body.appendChild(pay);
      }

      body.appendChild(el(
        "p",
        "catalog__legal",
        "Информация по расчету и цене автомобиля является ориентировочной, предоставляется для справки и не является публичной офертой. Оценивайте свои возможности и риски."
      ));

      var actions = el("div", "catalog__actions");
      actions.appendChild(actionButton("Рассчитать кредит", "credit", model.name, "button button--accent"));
      actions.appendChild(actionButton("Рассчитать лизинг", "leasing", model.name, "button button--line"));
      body.appendChild(actions);

      card.appendChild(media);
      if (paint) card.appendChild(paint);
      card.appendChild(body);
      item.appendChild(card);
      list.appendChild(item);
    });

    if (more && models.length > 4) {
      more.hidden = false;
      more.addEventListener("click", function () {
        var section = document.querySelector(".catalog");
        if (section) section.classList.add("catalog--open");
        more.hidden = true;
      });
    }
  }

  function renderColors(model, media) {
    var photos = model.colors.map(function (color, index) {
      var photo = el("img", "catalog__photo" + (index === 0 ? " catalog__photo--active" : ""));
      photo.src = color.image;
      photo.alt = model.name + ", " + color.name.toLowerCase();
      photo.sizes = "(min-width: 800px) 50vw, 100vw";
      media.appendChild(photo);
      return photo;
    });

    var group = el("div", "catalog__colors");
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", "Цвет " + model.name);

    var buttons = model.colors.map(function (color, index) {
      var button = el("button", "catalog__color" + (index === 0 ? " catalog__color--active" : ""));
      button.type = "button";
      button.style.setProperty("--swatch", color.hex);
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", index === 0 ? "true" : "false");
      button.setAttribute("tabindex", index === 0 ? "0" : "-1");
      button.setAttribute("aria-label", color.name);
      button.addEventListener("click", function () {
        select(index);
      });
      group.appendChild(button);
      return button;
    });

    function select(index) {
      photos.forEach(function (photo, photoIndex) {
        photo.classList.toggle("catalog__photo--active", photoIndex === index);
      });
      buttons.forEach(function (button, buttonIndex) {
        var selected = buttonIndex === index;
        button.classList.toggle("catalog__color--active", selected);
        button.setAttribute("aria-checked", selected ? "true" : "false");
        button.setAttribute("tabindex", selected ? "0" : "-1");
      });
    }

    group.addEventListener("keydown", function (event) {
      var current = buttons.findIndex(function (button) {
        return button.getAttribute("aria-checked") === "true";
      });
      var next = current;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % buttons.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + buttons.length) % buttons.length;
      else return;
      event.preventDefault();
      select(next);
      buttons[next].focus();
    });

    var paint = el("div", "catalog__paint");
    paint.appendChild(group);
    return paint;
  }

  var leadCopy = {
    credit: {
      title: "Рассчитаем кредит с максимальной выгодой",
      submit: "Узнать условия",
      form: "credit"
    },
    leasing: {
      title: "Рассчитать лизинг",
      submit: "Рассчитать лизинг",
      form: "leasing-popup"
    }
  };

  function actionButton(label, popup, model, className) {
    var button = el("button", className, label);
    var copy = leadCopy[popup] || { title: label, submit: label, form: popup };
    button.type = "button";
    button.setAttribute("data-open-popup", "lead");
    button.setAttribute("data-form", copy.form);
    button.setAttribute("data-popup-title", copy.title);
    button.setAttribute("data-popup-submit", copy.submit);
    button.setAttribute("data-model", model);
    return button;
  }

  function renderTrims(models) {
    var tabs = document.querySelector("[data-trim-tabs]");
    var list = document.querySelector("[data-trim-list]");
    var card = document.querySelector("[data-trim-card]");
    if (!tabs || !list || !card || !models.length) return;

    var current = 0;
    var trimIndex = 0;

    models.forEach(function (model, index) {
      var tab = el("button", "trims__tab" + (index === 0 ? " trims__tab--active" : ""), model.name.replace("Sollers ", ""));
      tab.type = "button";
      tab.id = "trim-tab-" + model.id;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", "trim-panel");
      tab.setAttribute("aria-selected", index === 0 ? "true" : "false");
      tab.setAttribute("tabindex", index === 0 ? "0" : "-1");
      tab.addEventListener("click", function () {
        current = index;
        trimIndex = 0;
        paint();
      });
      tabs.appendChild(tab);
    });

    function paint() {
      var model = models[current];
      var panel = document.getElementById("trim-panel");
      Array.prototype.forEach.call(tabs.children, function (tab, index) {
        var selected = index === current;
        tab.classList.toggle("trims__tab--active", selected);
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.setAttribute("tabindex", selected ? "0" : "-1");
        if (selected && panel) panel.setAttribute("aria-labelledby", tab.id);
      });
      list.replaceChildren();
      model.trims.forEach(function (trim, index) {
        var option = el("button", "trims__option" + (index === trimIndex ? " trims__option--active" : ""), trim.name);
        option.type = "button";
        option.setAttribute("aria-pressed", index === trimIndex ? "true" : "false");
        option.addEventListener("click", function () {
          trimIndex = index;
          paintCard(model, model.trims[trimIndex]);
          Array.prototype.forEach.call(list.children, function (node, nodeIndex) {
            var selected = nodeIndex === trimIndex;
            node.classList.toggle("trims__option--active", selected);
            node.setAttribute("aria-pressed", selected ? "true" : "false");
          });
        });
        list.appendChild(option);
      });
      paintCard(model, model.trims[trimIndex]);
    }

    function paintCard(model, trim) {
      card.replaceChildren();
      card.appendChild(el("p", "trims__kicker", model.name));
      card.appendChild(el("h3", "trims__name", trim.name));
      var specs = el("ul", "trims__specs");
      [
        ["Двигатель", trim.hp],
        ["Привод", trim.drive],
        ["Трансмиссия", trim.gear]
      ].forEach(function (row) {
        if (!row[1]) return;
        var item = el("li", "trims__spec");
        item.appendChild(el("span", "trims__spec-name", row[0]));
        item.appendChild(el("span", "trims__spec-value", row[1]));
        specs.appendChild(item);
      });
      card.appendChild(specs);
      var prices = el("div", "trims__prices");
      prices.appendChild(el("span", "catalog__caption", "Цена в кредит"));
      if (trim.priceOld > trim.price) {
        prices.appendChild(el("span", "trims__old", formatPrice(trim.priceOld)));
      }
      prices.appendChild(el("span", "trims__price", formatPrice(trim.price)));
      card.appendChild(prices);
      var actions = el("div", "trims__actions");
      actions.appendChild(actionButton("Рассчитать кредит", "credit", model.name + " " + trim.name, "button button--accent"));
      actions.appendChild(actionButton("Купить в лизинг", "leasing", model.name + " " + trim.name, "button button--line"));
      card.appendChild(actions);
    }

    paint();
  }
})();
