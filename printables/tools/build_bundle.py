#!/usr/bin/env python3
"""인쇄물 7종을 한 개의 HTML 파일로 묶는다.

낱장 HTML 7개가 계속 원본이고, 번들은 거기서 찍어내는 산출물이다.
글꼴과 그림까지 파일 안에 넣으므로 폴더 없이 그 파일 하나만 있으면 열린다.

    python3 printables/tools/build_bundle.py

-> printables/학급칠판게시물.html

묶으면서 풀어야 하는 것이 셋 있다.

1. 선택자 충돌
   낱장 파일들은 저마다 .head h1, .sheet, .foot 같은 같은 이름을 다른 값으로 쓴다
   (선택자 108개 중 13개가 겹친다). 그대로 합치면 마지막 것이 앞의 것을 덮는다.
   그래서 시트별 <style> 안의 선택자마다 #sNN 을 앞에 붙여 가둔다.
   공용 print.css 는 건드리지 않는다 — #sNN .head h1 이 더 구체적이라 자연히 이긴다.

2. 용지 규격
   @page 에는 선택자를 붙일 수 없다. 한 문서 안에서 장마다 규격이 다르므로,
   @page 를 밖으로 빼서 JS 데이터로 넘기고 인쇄 직전에 현재 장의 것을 주입한다.

3. 화면 크기
   A2 는 화면보다 크다. 바깥 래퍼에 transform: scale 을 걸어 줄인다.
   .sheet 의 mm 수치는 절대 손대지 않는다 — 그걸 줄이면 인쇄 규격이 깨진다.
"""

from __future__ import annotations

import base64
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
ASSETS = HERE / "assets"
OUT = HERE / "학급칠판게시물.html"

# (파일, 화면에 보일 이름, 규격 설명)
SHEETS = [
    ("01-timetable-a2.html", "주간 시간표", "A2 세로"),
    ("02-attendance-a3.html", "출결 특이사항", "A3 세로"),
    ("03-notice-a3.html", "오늘의 알림장", "A3 세로"),
    ("04-class-rules-a3.html", "우리 반 약속", "A3 세로"),
    ("05-birthday-a3.html", "생일 축하 달력", "A3 세로"),
    ("06-seating-a4.html", "자리 배치표", "A4 가로"),
    ("07-duty-a4.html", "1인 1역 · 당번표", "A4 세로"),
]


# ─────────────────────────────────────────────────────────── 자산 인라인

def data_uri(path: Path, mime: str) -> str:
    return "data:%s;base64,%s" % (
        mime, base64.b64encode(path.read_bytes()).decode("ascii"))


def inline_fonts(css: str) -> str:
    """fonts.css 의 url("fonts/*.woff2") 를 base64 로 바꾼다."""
    def sub(m: re.Match) -> str:
        f = ASSETS / m.group(1)
        return 'url("%s")' % data_uri(f, "font/woff2")
    return re.sub(r'url\("(fonts/[^"]+)"\)', sub, css)


def inline_svgs(html: str) -> str:
    """<img src="assets/svg/*.svg"> 를 base64 로 바꾼다."""
    def sub(m: re.Match) -> str:
        f = ASSETS / "svg" / m.group(1)
        return 'src="%s"' % data_uri(f, "image/svg+xml")
    return re.sub(r'src="assets/svg/([^"]+)"', sub, html)


# ─────────────────────────────────────────────────────────── CSS 가두기

def split_at_page(css: str) -> tuple[str, str]:
    """@page 블록을 떼어 내고 (나머지 CSS, size 값) 을 돌려준다."""
    size = ""
    blocks = re.findall(r'@page\s*\{[^}]*\}', css)
    for b in blocks:
        m = re.search(r'size:\s*([^;}]+)', b)
        if m:
            size = m.group(1).strip()
    return re.sub(r'@page\s*\{[^}]*\}', '', css), size


def scope(css: str, sid: str) -> str:
    """선택자마다 #sid 를 앞에 붙인다.

    중괄호 깊이를 세면서 훑는다. @media 같은 묶음 규칙의 헤더에는 붙이면 안 되고,
    그 안쪽 규칙에는 붙여야 하기 때문이다. 정규식 한 방으로는 이걸 가릴 수 없다.

    주석은 먼저 걷어낸다. 남겨 두면 선택자 앞에 붙어 "#s01 /* 설명 */ .grid" 같은
    모양이 되는데, 브라우저는 주석을 지우고 읽으니 동작은 하지만 읽기 어렵다.
    무엇보다 주석 안에 중괄호가 하나라도 있으면 깊이 세기가 그대로 어긋난다.
    """
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    out, buf, depth = [], [], 0
    for ch in css:
        if ch == "{":
            head = "".join(buf).strip()
            buf = []
            if depth == 0 or head.startswith("@"):
                # 최상위 선택자, 또는 @media 같은 묶음 규칙의 헤더
                if head.startswith("@"):
                    out.append(head + "{")
                else:
                    out.append(prefix(head, sid) + "{")
            else:
                # 묶음 규칙 안쪽 — 여기도 선택자다
                out.append(prefix(head, sid) + "{")
            depth += 1
        elif ch == "}":
            out.append("".join(buf))
            buf = []
            out.append("}")
            depth -= 1
        else:
            buf.append(ch)
    out.append("".join(buf))
    return "".join(out)


def prefix(head: str, sid: str) -> str:
    """쉼표로 나뉜 선택자 하나하나에 #sid 를 붙인다."""
    parts = []
    for p in head.split(","):
        p = p.strip()
        if not p:
            continue
        # 낱장 파일의 .sheet 는 번들에서 #sid 자신이 감싸는 대상이다
        parts.append("#%s %s" % (sid, p))
    return ", ".join(parts)


# ─────────────────────────────────────────────────────────── 조립

def extract(path: Path) -> tuple[str, str, str]:
    """낱장 HTML 에서 (스타일, 시트 마크업, @page size) 를 꺼낸다."""
    html = path.read_text(encoding="utf-8")
    style = "\n".join(re.findall(r"<style>(.*?)</style>", html, re.S))
    m = re.search(r'<div class="sheet">(.*)</div>\s*</body>', html, re.S)
    if not m:
        raise RuntimeError("%s: .sheet 를 못 찾았다" % path.name)
    return style, m.group(1), ""


def main() -> None:
    print_css = (ASSETS / "print.css").read_text(encoding="utf-8")
    fonts_css = inline_fonts((ASSETS / "fonts.css").read_text(encoding="utf-8"))

    sheet_css, sheet_html, sizes, nav = [], [], {}, []
    for i, (fname, label, paper) in enumerate(SHEETS, 1):
        sid = "s%02d" % i
        style, body, _ = extract(HERE / fname)
        style, size = split_at_page(style)
        sizes[sid] = size
        sheet_css.append("/* ===== %s — %s ===== */\n%s" % (sid, label, scope(style, sid)))
        sheet_html.append(
            '<section class="wrap" id="%s" data-label="%s">\n'
            '<div class="stage"><div class="sheet">%s</div></div>\n</section>'
            % (sid, label, inline_svgs(body)))
        nav.append('<button class="nav" data-go="%s"><b>%s</b><i>%s</i></button>'
                   % (sid, label, paper))

    html = SHELL.replace("/*FONTS*/", fonts_css) \
                .replace("/*PRINTCSS*/", print_css) \
                .replace("/*SHEETCSS*/", "\n".join(sheet_css)) \
                .replace("<!--NAV-->", "\n".join(nav)) \
                .replace("<!--SHEETS-->", "\n".join(sheet_html)) \
                .replace("/*SIZES*/", repr(sizes).replace("'", '"'))

    OUT.write_text(html, encoding="utf-8")
    print("  %s  %.1f MB" % (OUT.name, len(html.encode("utf-8")) / 1024 / 1024))


SHELL = r"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>1학년 3반 학급 칠판 게시물</title>
<style>
/*FONTS*/
/*PRINTCSS*/

/* ───── 번들 껍데기 ───── */
:root { --shell: #F3EDE2; --shell-dark: #4A3223; --shell-line: #DCD0BC; }

html, body { height: 100%; }
/* print.css 의 @media screen 이 body 에 건 회색 배경·가운데 정렬을 되돌린다 */
@media screen {
  body { padding: 0; background: var(--shell); display: block; }
}

#app { display: flex; height: 100vh; overflow: hidden; }

/* 왼쪽 목록 */
#side {
  width: 210px; flex: none; background: var(--shell-dark); color: #FDF6E9;
  display: flex; flex-direction: column; overflow-y: auto;
}
#side h1 {
  margin: 0; padding: 18px 16px 12px;
  font-family: var(--font-title); font-size: 17px; font-weight: 400;
  line-height: 1.3;
}
#side h1 span { display: block; font-size: 11px; opacity: .55; margin-top: 3px;
                font-family: var(--font-body); }
.nav {
  display: block; width: 100%; text-align: left; border: 0; cursor: pointer;
  background: transparent; color: inherit; padding: 10px 16px;
  font-family: var(--font-body); border-left: 3px solid transparent;
}
.nav b { display: block; font-size: 13px; font-weight: 400; }
.nav i { display: block; font-style: normal; font-size: 10.5px; opacity: .5;
         margin-top: 2px; }
.nav:hover { background: rgba(253, 246, 233, .07); }
.nav.on { background: rgba(253, 246, 233, .13); border-left-color: #E2762F; }

/* 위 도구 막대 */
#main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
#bar {
  flex: none; display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: #fff; border-bottom: 1px solid var(--shell-line);
}
#bar .t { font-family: var(--font-title); font-size: 15px; margin-right: auto; }
#bar button {
  font-family: var(--font-body); font-size: 12.5px; cursor: pointer;
  padding: 7px 13px; border-radius: 7px; border: 1px solid var(--shell-line);
  background: #fff; color: var(--shell-dark);
}
#bar button:hover { background: #FBF6EC; }
#bar button.primary { background: var(--shell-dark); color: #FDF6E9;
                      border-color: var(--shell-dark); }
#bar button.on { background: #E2762F; border-color: #E2762F; color: #fff; }
#msg { font-size: 12px; color: #7A8B5A; min-width: 96px; text-align: right; }

/* 종이 자리 */
#view { flex: 1; overflow: auto; padding: 22px; }
.wrap { display: none; }
.wrap.on { display: block; }
/* 종이를 창에 맞춰 줄이는 것은 바깥 래퍼의 몫이다.
   .sheet 의 mm 수치를 건드리면 인쇄 규격이 어긋난다. */
.stage { transform-origin: top left; }
.stage .sheet { box-shadow: 0 4px 22px rgba(0,0,0,.18); }

/* 편집 모드 */
body.edit .sheet [contenteditable]:hover { outline: 1.5px dashed #E2762F; }
body.edit .sheet [contenteditable]:focus { outline: 2px solid #E2762F; }
body.edit .sheet .blank { cursor: text; }
.sheet .blank[contenteditable] {
  font-family: var(--font-body); font-size: 4.5mm; color: var(--ink);
  padding: 1.5mm 2mm; line-height: 1.3;
}

/* ───── 인쇄 ───── */
@media print {
  #side, #bar { display: none !important; }
  #app, #main { display: block; height: auto; overflow: visible; }
  #view { padding: 0; overflow: visible; }
  .wrap { display: none !important; }
  .wrap.on { display: block !important; }
  .stage { transform: none !important; }
  .stage .sheet { box-shadow: none; }
  [contenteditable] { outline: none !important; }
}

/*SHEETCSS*/
</style>
</head>
<body>
<div id="app">
  <nav id="side">
    <h1>학급 칠판 게시물<span>1학년 3반 · 소프트웨어개발과</span></h1>
    <!--NAV-->
  </nav>
  <div id="main">
    <div id="bar">
      <span class="t" id="title"></span>
      <span id="msg"></span>
      <button id="editBtn">편집 모드</button>
      <button id="saveBtn">저장</button>
      <button id="resetBtn">되돌리기</button>
      <button id="dlBtn">HTML 내려받기</button>
      <button id="printBtn" class="primary">인쇄</button>
    </div>
    <div id="view"><!--SHEETS--></div>
  </div>
</div>

<script>
(function () {
  var SIZES = /*SIZES*/;
  var KEY = 'classboard.v1.';
  var wraps = [].slice.call(document.querySelectorAll('.wrap'));
  var navs = [].slice.call(document.querySelectorAll('.nav'));
  var cur = wraps[0].id;
  var editing = false;
  var pristine = {};          // 되돌리기용 원본
  wraps.forEach(function (w) { pristine[w.id] = w.querySelector('.sheet').innerHTML; });

  function msg(t) {
    document.getElementById('msg').textContent = t || '';
    if (t) setTimeout(function () {
      document.getElementById('msg').textContent = '';
    }, 2200);
  }

  /* localStorage 는 브라우저 설정에 따라 막힐 수 있다. 막혀도 나머지는 돌아가야 한다. */
  function store(k, v) {
    try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
          return true; } catch (e) { return false; }
  }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  wraps.forEach(function (w) {
    var saved = load(KEY + w.id);
    if (saved) w.querySelector('.sheet').innerHTML = saved;
  });

  /* 창 너비에 맞춰 종이를 줄인다 */
  function fit() {
    var view = document.getElementById('view');
    var avail = view.clientWidth - 44;
    wraps.forEach(function (w) {
      var sheet = w.querySelector('.sheet');
      var stage = w.querySelector('.stage');
      var pw = sheet.offsetWidth, ph = sheet.offsetHeight;
      if (!pw) return;
      var k = Math.min(1, avail / pw);
      stage.style.transform = 'scale(' + k + ')';
      // 축소해도 자리는 원래 크기만큼 잡히므로 래퍼 높이를 직접 맞춰 준다
      stage.style.height = (ph * k) + 'px';
      stage.style.width = (pw * k) + 'px';
    });
  }

  function show(id) {
    cur = id;
    wraps.forEach(function (w) { w.classList.toggle('on', w.id === id); });
    navs.forEach(function (n) { n.classList.toggle('on', n.dataset.go === id); });
    var w = document.getElementById(id);
    document.getElementById('title').textContent = w.dataset.label;
    fit();
  }

  navs.forEach(function (n) {
    n.addEventListener('click', function () { show(n.dataset.go); });
  });

  /* 편집 모드
     빈칸은 장마다 이름이 다르다 — .blank(01·03·06·07), .line(03), .ln(05),
     .sign(04), .rs(02), .seat(06). 클래스 이름을 일일이 세면 새 장을 만들 때마다
     빠뜨리므로, 구조로 판단한다: 자식 요소가 없는 말단이면 글자든 빈칸이든 연다.
     자식이 <img> 뿐인 것도 말단으로 친다 (05 의 "1월" + 계절 그림 같은 칸). */
  var SKIP = 'mk circle spacer corner'.split(' ');   // 장식용 — 열면 안 된다
  var ALLOW = 'seat'.split(' ');                     // 자식이 있어도 여는 칸

  function editable(on) {
    editing = on;
    document.body.classList.toggle('edit', on);
    document.getElementById('editBtn').classList.toggle('on', on);
    wraps.forEach(function (w) {
      var els = w.querySelector('.sheet').querySelectorAll('*');
      [].forEach.call(els, function (el) {
        if (el.tagName === 'IMG' || el.tagName === 'BR') return;
        if (SKIP.some(function (c) { return el.classList.contains(c); })) return;

        var hasNonImgChild = false;
        [].forEach.call(el.children, function (c) {
          if (c.tagName !== 'IMG') hasNonImgChild = true;
        });
        var open = !hasNonImgChild ||
                   ALLOW.some(function (c) { return el.classList.contains(c); });
        if (!open) return;

        if (on) el.setAttribute('contenteditable', 'true');
        else el.removeAttribute('contenteditable');
      });
    });
    msg(on ? '편집 켜짐 — 글자나 빈칸을 눌러 고치세요' : '편집 꺼짐');
  }

  document.getElementById('editBtn').onclick = function () { editable(!editing); };

  document.getElementById('saveBtn').onclick = function () {
    var ok = true;
    wraps.forEach(function (w) {
      if (!store(KEY + w.id, w.querySelector('.sheet').innerHTML)) ok = false;
    });
    msg(ok ? '저장했습니다' : '저장 실패 — 내려받기를 쓰세요');
  };

  document.getElementById('resetBtn').onclick = function () {
    if (!confirm('고친 내용을 모두 버리고 처음 상태로 되돌릴까요?')) return;
    wraps.forEach(function (w) {
      w.querySelector('.sheet').innerHTML = pristine[w.id];
      store(KEY + w.id, null);
    });
    if (editing) editable(true);
    fit();
    msg('되돌렸습니다');
  };

  /* 인쇄 — 현재 장의 용지 규격을 그때 주입한다.
     한 문서 안에서 장마다 규격이 다르므로 @page 를 미리 못 박아 둘 수 없다. */
  var pageStyle = document.createElement('style');
  document.head.appendChild(pageStyle);
  document.getElementById('printBtn').onclick = function () {
    pageStyle.textContent = '@page { size: ' + SIZES[cur] + '; margin: 0; }';
    var was = editing;
    if (was) editable(false);
    window.print();
    if (was) editable(true);
  };

  /* 내려받기 — 지금 화면 그대로를 새 HTML 파일로 */
  document.getElementById('dlBtn').onclick = function () {
    var was = editing;
    if (was) editable(false);
    var clone = document.documentElement.cloneNode(true);
    [].forEach.call(clone.querySelectorAll('.stage'), function (s) {
      s.removeAttribute('style');            // 화면 배율은 저장하지 않는다
    });
    [].forEach.call(clone.querySelectorAll('.wrap, .nav'), function (n) {
      n.classList.remove('on');
    });
    clone.querySelector('#msg').textContent = '';
    var html = '<!doctype html>\n' + clone.outerHTML;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = '학급칠판게시물.html';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    if (was) editable(true);
    msg('내려받았습니다');
  };

  window.addEventListener('resize', fit);
  document.fonts.ready.then(fit);
  show(cur);
})();
</script>
</body>
</html>
"""


if __name__ == "__main__":
    main()
