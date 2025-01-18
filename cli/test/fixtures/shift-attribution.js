let i = 0;
const handle = setInterval(function() {
  if (i === 0) {
    document.querySelector('#red').style.height = 500;
  } else if (i === 1) {
    const iframeEl = document.createElement('iframe');
    iframeEl.src = 'simple-page.html';
    document.querySelector('.iframe-slot').append(iframeEl);
  } else {
    clearInterval(handle);
  }

  i++;
}, 500);
