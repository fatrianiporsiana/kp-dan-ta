<?php

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Pengaman: test yang memakai RefreshDatabase menjalankan migrate:fresh,
     * yang menghapus SEMUA tabel. Hentikan test jika database yang dipakai
     * bukan database khusus test (nama berakhiran "_test").
     */
    public function createApplication(): Application
    {
        $app = parent::createApplication();

        $connection = $app['config']->get('database.default');
        $database = (string) $app['config']->get("database.connections.{$connection}.database");

        if ($database !== ':memory:' && ! str_ends_with($database, '_test')) {
            throw new RuntimeException(
                "Test dihentikan: database '{$database}' bukan database test (nama harus berakhiran _test)."
            );
        }

        return $app;
    }
}
