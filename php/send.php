<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method'], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'json'], JSON_UNESCAPED_UNICODE);
    exit;
}

$clean = static function (string $value): string {
    return trim(str_replace(["\r", "\n"], ' ', $value));
};

$lead = [
    'form' => $clean((string) ($data['form'] ?? '')),
    'name' => $clean((string) ($data['name'] ?? '')),
    'phone' => $clean((string) ($data['phone'] ?? '')),
    'vehicle' => $clean((string) ($data['vehicle'] ?? '')),
    'model' => $clean((string) ($data['model'] ?? '')),
    'consent' => !empty($data['consent']),
    'ads' => !empty($data['ads']),
    'created_at' => date('c'),
];

$digits = preg_replace('/\D+/', '', $lead['phone']) ?? '';
if (strlen($digits) !== 11 || !$lead['consent'] || !$lead['ads'] || $lead['form'] === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'fields'], JSON_UNESCAPED_UNICODE);
    exit;
}

$dir = __DIR__ . '/storage';
if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'storage'], JSON_UNESCAPED_UNICODE);
    exit;
}

$line = json_encode($lead, JSON_UNESCAPED_UNICODE) . PHP_EOL;
if (file_put_contents($dir . '/leads.log', $line, FILE_APPEND | LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'write'], JSON_UNESCAPED_UNICODE);
    exit;
}

$config = require __DIR__ . '/config.php';
if (!empty($config['to'])) {
    $body = "Форма: {$lead['form']}\nИмя: {$lead['name']}\nТелефон: {$lead['phone']}\nАвто: {$lead['vehicle']}\nМодель: {$lead['model']}\n";
    $headers = 'From: ' . $config['from'] . "\r\nContent-Type: text/plain; charset=UTF-8";
    @mail($config['to'], $config['subject'], $body, $headers);
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
