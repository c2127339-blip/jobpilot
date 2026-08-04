#!/usr/bin/env python3
"""
生成 JobPilot 的 README 终端演示截图（docs/demo.png）。
运行 `node dist/index.js questions --demo` 获取真实输出，
用 PIL 渲染成终端风格图片。
"""
import os
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE = os.path.join(ROOT, 'dist', 'index.js')


def run(cmd: list[str]) -> str:
    """运行命令，剥离 ANSI 颜色码，返回纯文本。"""
    out = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    return re.sub(r'\x1b\[[0-9;]*m', '', out.stdout)


def main() -> None:
    q_demo = run(['node', NODE, 'questions', '--demo'])
    q_lines = q_demo.strip('\n').split('\n')[:28]

    # ---- 配色（Catppuccin Mocha 系） ----
    W, H = 960, 660
    bg = (30, 30, 46)
    panel = (24, 24, 36)
    text_fg = (205, 214, 244)
    text_dim = (147, 153, 178)
    accent = (137, 180, 250)     # 蓝：分类标题
    accent2 = (245, 194, 91)     # 黄：难度
    title_fg = (148, 226, 213)   # 绿：标题栏
    prompt_fg = (166, 227, 161)  # 绿：命令提示
    dot_red = (231, 111, 81)
    dot_yel = (245, 194, 91)
    dot_grn = (166, 227, 161)

    img = Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(img)

    # ---- 字体 ----
    f_title = ImageFont.truetype(r'C:/Windows/Fonts/msyhbd.ttc', 22)
    f_prompt = ImageFont.truetype(r'C:/Windows/Fonts/CascadiaCode.ttf', 18)
    f_body = ImageFont.truetype(r'C:/Windows/Fonts/msyh.ttc', 15)
    f_body_mono = ImageFont.truetype(r'C:/Windows/Fonts/CascadiaCode.ttf', 15)
    f_dim = ImageFont.truetype(r'C:/Windows/Fonts/msyhl.ttc', 14)

    # ---- 标题栏 ----
    d.rectangle([0, 0, W, 44], fill=panel)
    d.line([0, 44, W, 44], fill=(49, 50, 68), width=1)
    dots = [dot_red, dot_yel, dot_grn]
    for i, col in enumerate(dots):
        cx = 24 + i * 22
        d.ellipse([cx - 6, 22 - 6, cx + 6, 22 + 6], fill=col)
    d.text((90, 12), 'jobpilot — 终端演示', font=f_title, fill=title_fg)

    # ---- 命令提示 ----
    d.text((24, 58), '$ jp questions --demo', font=f_prompt, fill=prompt_fg)

    # ---- 正文 ----
    x, y = 24, 100
    line_h = 27
    for line in q_lines:
        if not line.strip():
            y += 12
            continue
        if line.startswith('▍'):
            d.text((x, y), line, font=f_body, fill=accent)
            y += line_h
            continue
        if '──' in line:
            d.text((x + 14, y), line.strip(), font=f_dim, fill=text_dim)
            y += line_h - 6
            continue
        m = re.match(r'\s*(\d+)\.\s*(.+?)(\[[^\]]+\])?\s*$', line)
        if m:
            num, body, diff = m.group(1), m.group(2), (m.group(3) or '')
            d.text((x + 22, y), f'{num}. ', font=f_body_mono, fill=text_dim)
            num_w = d.textlength(f'{num}. ', font=f_body_mono)
            d.text((x + 22 + num_w, y), body, font=f_body, fill=text_fg)
            if diff:
                dl = d.textlength(f'{num}. {body}', font=f_body)
                d.text((x + 22 + dl + 10, y), diff, font=f_body, fill=accent2)
            y += line_h
            continue
        if line.strip().startswith('为什么问') or line.strip().startswith('参考思路'):
            d.text((x + 34, y), line.strip(), font=f_dim, fill=text_dim)
            y += line_h - 8
            continue
        d.text((x, y), line, font=f_body, fill=text_fg)
        y += line_h

    # ---- 保存 ----
    out_dir = os.path.join(ROOT, 'docs')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'demo.png')
    img.save(out_path)
    print(f'saved {out_path} ({W}x{H})')


if __name__ == '__main__':
    main()
