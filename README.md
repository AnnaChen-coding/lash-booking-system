# 美睫店官网 · Vue 3

[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)

基于 **Vue 3 + TypeScript + Vite** 的美睫门店前端：**首页展示**、**服务浏览**、**在线预约**、**用户评价**，以及需登录的 **后台预约管理**（管理员白名单）。数据层支持 **Supabase**、自建 **REST API**，或未配置时使用浏览器 **localStorage** 演示。

---

## 目录

- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [Supabase 配置（推荐）](#supabase-配置推荐)
- [通用 REST 后端](#通用-rest-后端)
- [后台与登录](#后台与登录)
- [路由一览](#路由一览)
- [项目结构](#项目结构)
- [开发建议](#开发建议)
- [许可](#许可)

---

## 功能概览

| 模块 | 说明 |
|------|------|
| **首页** `/` | 轮播、服务精选、评价、门店信息、行动号召（CTA） |
| **服务** `/services` | 服务列表与筛选 |
| **预约** `/booking` | 选择服务、日期与时段并提交预约 |
| **登录** `/login` | 未配 Supabase 时为本地 Mock；配置后为 Supabase Auth 邮箱密码 |
| **后台** `/admin` | 预约列表、筛选与统计；**仅 `admin_emails` 白名单邮箱**可访问 |

**数据优先级**：配置了 `VITE_SUPABASE_*` 时走 Supabase → 否则若配置了 `VITE_API_BASE_URL` 走 REST → 否则使用 **localStorage** 本地演示。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3、Vue Router 5、Pinia |
| 构建 | Vite 7 |
| UI | Element Plus |
| 质量 | TypeScript、ESLint、Oxlint、vue-tsc |
| 后端（可选） | Supabase（`@supabase/supabase-js`）或自建 REST |

---

## 环境要求

- **Node.js**：`^20.19.0` 或 `>=22.12.0`（见仓库根目录 `package.json` 的 `engines`）

---

## 快速开始

```bash
git clone https://github.com/你的用户名/仓库名.git
cd 仓库名
npm install
npm run dev
