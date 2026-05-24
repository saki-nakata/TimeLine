import { useState } from 'react';
import Layout from '../components/Layout';
import Timeline from '../components/Timeline';

export default function HomePage() {
  const [postFormOpen, setPostFormOpen] = useState(false);

  return (
    <Layout onPostClick={() => setPostFormOpen(true)}>
      <div className="pt-3 pl-4">
        <Timeline
          postFormOpen={postFormOpen}
          setPostFormOpen={setPostFormOpen}
        />
      </div>
    </Layout>
  );
}
