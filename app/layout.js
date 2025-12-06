import './globals.css';

export const metadata = {
  title: 'CatTab-新标签页',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
