import json
import sys

from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    ContextualRelevancyMetric,
    HallucinationMetric,
    GEval
)
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

prompt = sys.argv[1]
response = sys.argv[2]
expected_intent = sys.argv[3]

test_case = LLMTestCase(
    input=prompt,
    actual_output=response,
    expected_output=expected_intent
)

# Standard metrics
relevancy = AnswerRelevancyMetric(threshold=0.7)
faithfulness = FaithfulnessMetric(threshold=0.7)
contextual_relevancy = ContextualRelevancyMetric(threshold=0.7)
hallucination = HallucinationMetric(threshold=0.7)

# GEval-based custom metrics for Completeness and Conciseness
completeness = GEval(
    name="CompletenessMetric",
    criteria="Does the response fully address all aspects of the user's question without missing key information?",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
    threshold=0.7
)

conciseness = GEval(
    name="ConcisenessMetric",
    criteria="Is the response concise and free of unnecessary repetition or filler while still being complete?",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.7
)

metrics = [
    relevancy,
    faithfulness,
    contextual_relevancy,
    hallucination,
    completeness,
    conciseness
]

results = {}

for metric in metrics:
    metric.measure(test_case)
    metric_name = getattr(metric, 'name', None) or type(metric).__name__
    results[metric_name] = {
        "score": metric.score,
        "passed": metric.is_successful()
    }

print(json.dumps(results))
