import styles from "./styles.module.css";
import ChatApp from "./components/ChatApp";

export const metadata = {
  title: "Chat Widget with Authentication",
  description: "A secure implementation of Chat with user authentication",
};

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Chat Widget with Authentication</h1>
        <ChatApp />
      </main>
    </div>
  );
}
