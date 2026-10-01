# intclass

Русскоязычный справочник видеоуроков разных тем, размещённый на GitHub Pages.

**Live site:** https://losdek.github.io/intclass/

## Что есть на сайте

```
index.html # Главная: герой, темы и сценарий обучения
lessons.html # Библиотека видеоуроков с фильтрами
css/style.css # Белая минималистичная тема и анимации
js/main.js # Шапка, reveal-анимации и необязательный профиль
js/lessons.js # Данные уроков, фильтры и YouTube-видео
```

## Добавить видеоурок

Откройте `js/lessons.js` и добавьте объект в массив `LESSONS`:

```js
{
 title: "Название урока",
 description: "Краткое текстовое описание.",
 subject: "math", // math | physics | chemistry | biology | history | english
 videoId: "WUvTyaaNkzM", // the part after watch?v= in the YouTube URL
},
```

После push GitHub Pages автоматически обновит сайт.

## Профиль и cookies

Регистрация необязательна. Если посетитель заполнит форму, имя и email сохраняются в cookie `intclass_profile` только в его браузере на один год. Пароль не запрашивается и данные не отправляются на сервер. Для полноценной авторизации нужен отдельный backend.

## Переименовать проект

Название сайта находится в `<title>` и элементах `.logo` в HTML-файлах. При переименовании репозитория URL GitHub Pages также изменится.
