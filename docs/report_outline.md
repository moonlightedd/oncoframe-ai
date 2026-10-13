# ONCOFRAME AI — Report Outline

## 1. Introduction
- Motivation: lung CT screening generates many candidate regions; automated classification can help prioritize review
- Goal: build an explainable, browser-based nodule-candidate classifier for research/education
- Scope: candidate-level classification (nodule vs. non-nodule), NOT cancer diagnosis

## 2. Dataset
- Source: LUNA16 challenge (derived from LIDC-IDRI)
- Data preparation: features extracted offline from candidates_V2.csv
- Schema: candidate_id, group_id, coordinates, numeric image features, label (0/1)
- Rows are candidates, not independent patients
- License: user must verify at https://luna16.grand-challenge.org/Data/

## 3. Data Audit
- Row count: [insert your row count]
- Group count: [insert your group count]
- Class balance: [insert your positive/negative counts]
- Missing values: [insert your missing value summary]
- 5,000-row check: [insert pass/fail]
- Duplicate check: [insert duplicate count]

## 4. Methods
- Grouped train/test split (80/20 by group, seed 42)
- Group overlap verification: [insert overlap count — must be 0]
- Logistic Regression: gradient descent, L2, class weights, 800 epochs
- Random Forest: 40 trees, max depth 8, feature subsampling, class weights
- Standardizer fitted on training data only
- Class imbalance handled via class weights (no row duplication)

## 5. Evaluation Results
- Model comparison table: [insert accuracy, precision, recall, F1, AUC, Brier]
- ROC curves: [insert your ROC-AUC values]
- PR curves: [insert your PR-AUC values]
- Calibration: [insert your Brier scores]
- Bootstrap 95% CIs: [insert your CI values]

## 6. Explainability
- Random Forest feature importances: [insert top features]
- Logistic Regression coefficients: [insert top features and directions]
- Note: importances show association, not causation

## 7. Error Analysis
- False positives: [insert your FP count]
- False negatives: [insert your FN count]
- Error distribution by feature: [insert your binned error analysis]
- Auto-generated summary: [insert your summary]

## 8. Limitations
- Candidate-level labels, not patient-level
- Class imbalance
- Group-mapping caveat
- No clinical validation
- Browser compute limits
- No 3D viewing or segmentation

## 9. Future Work
- 3D CT volume viewing
- Nodule segmentation
- Diameter/volume estimation
- Longitudinal scan comparison
- Improved explainability (SHAP, partial dependence)
- External validation
- Secure DICOM import and de-identification

## 10. Conclusion
- Summary of what was built
- Key findings (from your measured results)
- Educational value of the tool
