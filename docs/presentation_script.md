# ONCOFRAME AI — Presentation Script (10 slides, ~40 seconds each)

## Slide 1: Introduction
"ONCOFRAME AI is an explainable lung CT nodule-candidate classification tool built as a university research project. It runs entirely in the browser — no backend, no data leaves your computer. It's important to note: this is a research and education prototype, not clinically validated, and not for diagnosis. A nodule candidate is not a cancer diagnosis."

## Slide 2: Problem & Motivation
"Lung CT scans produce hundreds of candidate regions. Manually reviewing each one is time-consuming. Our tool classifies candidates as nodule or non-nodule based on image features, helping prioritize which candidates deserve closer review. We focus on explainability so researchers can understand which features drive predictions."

## Slide 3: Dataset
"We use the LUNA16 challenge dataset, derived from LIDC-IDRI. Each row represents a candidate with coordinates and numeric image features like mean HU, standard deviation, entropy, and gradient. Labels are 1 for annotated nodule candidates and 0 for non-nodules. Importantly, multiple candidates come from the same scan, so we use group-based splitting to prevent data leakage."

## Slide 4: Data Audit
"After uploading the CSV, the Dataset Audit page shows [insert your row count] rows across [insert your group count] groups. The class balance is [insert your positive/negative ratio]. [Insert whether the 5,000-row check passed]. [Insert your duplicate-row count]. The app clearly states that rows are candidates, not independent patients."

## Slide 5: Training
"We split the data 80/20 by group using a seeded random number generator with seed 42. The group overlap check confirms [insert overlap count — must be 0] overlapping groups. We train two models: Logistic Regression with L2 regularization and class weights, and a Random Forest with 40 trees. Training runs in a Web Worker to keep the UI responsive. The standardizer is fitted on training data only."

## Slide 6: Evaluation
"On the held-out test set, our models achieved: Logistic Regression with [insert your accuracy] accuracy and [insert your AUC] ROC-AUC; Random Forest with [insert your accuracy] accuracy and [insert your AUC] ROC-AUC. We also report precision, recall, specificity, F1, and Brier score. Group-level bootstrap 95% confidence intervals are [insert your CI values]."

## Slide 7: Calibration & Curves
"The ROC curve shows [insert your ROC-AUC] and the PR curve shows [insert your PR-AUC]. The calibration plot compares predicted probabilities to observed proportions, with Brier scores of [insert your Brier scores]. These help assess whether the models' probability estimates are reliable, not just their classification accuracy."

## Slide 8: Explainability
"Random Forest feature importances show that [insert your top features] are the most important. Logistic Regression standardized coefficients show [insert your top features] with [insert positive/negative] associations. We include a clear note: importances show association in this dataset, not causation."

## Slide 9: Error Analysis
"We list all false positives and false negatives with their feature values. When grouped by [insert your chosen feature], the bin [insert your bin range] has the most errors with [insert your FP/FN counts]. The auto-generated summary states: [insert your summary]. All numbers are computed from the uploaded data."

## Slide 10: Limitations & Future Work
"Key limitations: candidate-level labels, class imbalance, no clinical validation, and browser compute limits. Proposed future work includes 3D CT viewing, nodule segmentation, diameter estimation, longitudinal scans, improved explainability with SHAP, external validation, and secure DICOM import. The tool ships empty of data — every number you see comes from your own uploaded dataset."
