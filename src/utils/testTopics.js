/**
 * Aggregates test sections into a topics breakdown array.
 * Supports API `sections` or pre-shaped `topics` on the test object.
 */
export function buildTopicBreakdown(test, topicMap = {}) {
  if (Array.isArray(test.topics) && test.topics.length > 0) {
    return test.topics.map((t) => ({
      name: t.name,
      questions: t.questions ?? t.questionCount ?? 0,
    }));
  }

  const sections = test.sections || [];
  const aggregated = {};

  for (const section of sections) {
    const topicId = section.topic;
    const name =
      section.topicName ||
      topicMap[topicId] ||
      (typeof section.topic === 'object' ? section.topic?.name : null) ||
      'Unknown Topic';

    if (!aggregated[topicId]) {
      aggregated[topicId] = { name, questions: 0 };
    }
    aggregated[topicId].questions += section.questionCount || 0;
  }

  return Object.values(aggregated);
}

export async function enrichTestsWithTopics(tests, getTopics) {
  const activeTests = tests.filter((t) => t.isActive);

  const subjectIds = [
    ...new Set(
      activeTests.flatMap((t) => (t.sections || []).map((s) => s.subject).filter(Boolean))
    ),
  ];

  const topicMap = {};
  await Promise.all(
    subjectIds.map(async (subjectId) => {
      try {
        const res = await getTopics(subjectId);
        res.data.forEach((topic) => {
          topicMap[topic._id] = topic.name;
        });
      } catch {
        /* skip failed subject */
      }
    })
  );

  return activeTests.map((test) => ({
    ...test,
    topics: buildTopicBreakdown(test, topicMap),
  }));
}
