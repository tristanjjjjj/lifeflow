# LifeFlow · AI 校园生活规划助手

一个纯前端、可离线运行的校园时间管理工具。把课程、任务和空闲时间，整理成一份真正可执行的日程。

> 无后端、无账号、无追踪。所有数据保存在你自己的浏览器里。

## 功能

| 模块 | 说明 |
|---|---|
| **总览** | 今天的待办、课程、空闲时间和完成率，全部根据真实数据计算 |
| **我的课表** | 拖拽调整课程、手动添加、周次切换（支持单双周）、**从教务系统 PDF 一键导入** |
| **任务中心** | 一句话添加任务、搜索/排序、逾期标红、编辑与删除 |
| **AI 智能规划** | 自动避开上课时间，按优先级把任务填进空闲时段，可保存与重新调整 |
| **数据统计** | 完成率、专注时长、按星期分布，全部来自真实记录 |
| **完成任务鼓励** | 接入 API Key 后，每次完成任务由模型生成一句鼓励 |

## 使用

直接用浏览器打开 `index.html` 即可，或者启动本地服务：

```bash
python3 -m http.server 8000
```

然后访问 http://localhost:8000

## AI 接入（可选）

右上角 **AI** 按钮填入自己的 API Key 即可启用智能识别与鼓励语，支持任意 OpenAI 兼容接口：

| 服务 | API 地址 | 模型 |
|---|---|---|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-flash` |
| Kimi | `https://api.moonshot.cn/v1` | `kimi-k2` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| 本机 Ollama | `http://localhost:11434/v1` | `llama3` |

> **Key 只保存在你自己的浏览器 localStorage，不会写进代码，也不会提交到仓库。**
> 不填 Key 也能完整使用，识别会回退到本地规则。

## 中英双语

右上角 `中 / EN` 切换，首次打开时也可在欢迎页选择。语言选择会记住。

## 深浅色

自动跟随系统，也可点按钮在「自动 / 浅色 / 深色」之间切换。

## 数据存储

| 数据 | 存储位置 |
|---|---|
| 任务、课表、计划 | 浏览器 `localStorage` |
| 名字、语言、主题、AI Key | 浏览器 `localStorage` |

换设备前，在「数据统计 → 数据管理」导出 JSON 备份，再在新设备导入。

## 技术栈

- 原生 HTML / CSS / JavaScript，无构建步骤、无框架
- [pdf.js](https://mozilla.github.io/pdf.js/)（本地 vendor 目录）解析课表 PDF
- CSS 变量 + `color-mix()` 实现深浅色主题
- 响应式布局，适配手机

## 目录结构

```
.
├── index.html          # 页面结构
├── styles.css          # 样式（Apple 风格 / 深浅色 / 响应式）
├── app.js              # 业务逻辑（任务、课表、排程、AI、导入导出）
├── i18n.js             # 中英文案
├── vendor/
│   ├── pdf.min.js          # pdf.js 主库
│   └── pdf.worker.min.js   # pdf.js worker
└── README.md
```
