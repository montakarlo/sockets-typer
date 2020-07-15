export const createElement = ({ tagName, className, html, attributes = {} }) => {
  const element = document.createElement(tagName);

  if (className) {
    addClass(element, className);
  }

  Object.keys(attributes).forEach(key => element.setAttribute(key, attributes[key]));
   element.innerHTML = html
  return element;
};

export const addClass = (element, className) => {
  const classNames = formatClassNames(className);
  element.classList.add(...classNames);
};

export const removeClass = (element, className) => {
  const classNames = formatClassNames(className);
  element.classList.remove(...classNames);
};

export const formatClassNames = className => className.split(" ").filter(Boolean);
